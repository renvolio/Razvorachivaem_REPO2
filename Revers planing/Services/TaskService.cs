using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.DTOs.Task;
using Revers_planing.Models;

namespace Revers_planing.Services;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _context;

    public TaskService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Task_>> GetByProjectForTeamAsync(Guid projectId, Guid teamId)
    {
        return await _context.Tasks
            .Include(t => t.Children)
            .Where(t => t.ProjectId == projectId && t.TeamId == teamId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Task_> CreateAsync(Guid studentId, Guid subjectId, Guid projectId, CreateTaskDTO dto)
    {
        var student = await _context.Students
            .Include(s => s.Team)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new InvalidOperationException("студент не найден");

        if (student.Team == null || student.Team.SubjectId != subjectId)
        {
            throw new UnauthorizedAccessException("студент не состоит в команде предмета");
        }

        var team = student.Team;
        if (dto.TeamId != team.Id)
        {
            throw new UnauthorizedAccessException("нельзя создавать задачу для другой команды");
        }

        var project = await _context.Projects
            .Include(p => p.Subject)
            .FirstOrDefaultAsync(p => p.Id == projectId && p.SubjectId == subjectId)
            ?? throw new InvalidOperationException("проект не найден");

        ValidateTaskTiming(dto.StartDate, dto.EndDate, project, null);

        Task_? parentTask = null;
        if (dto.ParentTaskId.HasValue)
        {
            parentTask = await _context.Tasks
                .Include(t => t.Project)
                .ThenInclude(p => p.Subject)
                .FirstOrDefaultAsync(t => t.Id == dto.ParentTaskId.Value)
                ?? throw new InvalidOperationException("родительская задача не найдена");

            if (parentTask.TeamId != team.Id)
            {
                throw new UnauthorizedAccessException("нельзя привязать к задаче другой команды");
            }

            if (parentTask.ProjectId != projectId)
            {
                throw new InvalidOperationException("родительская задача относится к другому проекту");
            }

            ValidateTaskTiming(dto.StartDate, dto.EndDate, project, parentTask);
        }

        if (dto.ResponsibleStudentId.HasValue)
        {
            await EnsureStudentInTeam(dto.ResponsibleStudentId.Value, team.Id);
        }

        var task = new Task_
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            DeadlineAssessment = dto.DeadlineAssessment,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            TeamId = dto.TeamId,
            ProjectId = projectId,
            ParentTaskId = dto.ParentTaskId,
            Status = Models.TaskStatus.Planned,
            ResponsibleStudentId = dto.ResponsibleStudentId
        };

        await _context.Tasks.AddAsync(task);
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<Task_> UpdateAsync(Guid studentId, Guid subjectId, Guid taskId, UpdateTaskDTO dto)
    {
        var student = await _context.Students
            .Include(s => s.Team)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new InvalidOperationException("студент не найден");

        if (student.Team == null || student.Team.SubjectId != subjectId)
        {
            throw new UnauthorizedAccessException("студент не состоит в команде предмета");
        }

        var task = await _context.Tasks
            .Include(t => t.Project)
            .ThenInclude(p => p.Subject)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new InvalidOperationException("задача не найдена");

        if (task.TeamId != student.Team.Id)
        {
            throw new UnauthorizedAccessException("нельзя изменять задачу другой команды");
        }

        if (dto.ResponsibleStudentId.HasValue)
        {
            await EnsureStudentInTeam(dto.ResponsibleStudentId.Value, student.Team.Id);
        }

        if (dto.Name != null) task.Name = dto.Name;
        if (dto.Description != null) task.Description = dto.Description;
        if (dto.DeadlineAssessment.HasValue) task.DeadlineAssessment = dto.DeadlineAssessment.Value;

        var newProjectId = dto.ProjectId ?? task.ProjectId;
        var project = await _context.Projects
            .Include(p => p.Subject)
            .FirstOrDefaultAsync(p => p.Id == newProjectId && p.SubjectId == subjectId)
            ?? throw new InvalidOperationException("проект не найден");

        var newParentTaskId = dto.ParentTaskId ?? task.ParentTaskId;
        Task_? parentTask = null;
        if (newParentTaskId.HasValue)
        {
            parentTask = await _context.Tasks
                .Include(t => t.Project)
                .ThenInclude(p => p.Subject)
                .FirstOrDefaultAsync(t => t.Id == newParentTaskId.Value)
                ?? throw new InvalidOperationException("родительская задача не найдена");

            if (parentTask.TeamId != student.Team.Id)
            {
                throw new UnauthorizedAccessException("нельзя привязать к задаче другой команды");
            }

            if (parentTask.ProjectId != newProjectId)
            {
                throw new InvalidOperationException("родительская задача относится к другому проекту");
            }
        }

        var newStart = dto.StartDate ?? task.StartDate;
        var newEnd = dto.EndDate ?? task.EndDate;
        ValidateTaskTiming(newStart, newEnd, project, parentTask);

        task.ProjectId = newProjectId;
        task.ParentTaskId = newParentTaskId;
        task.StartDate = newStart;
        task.EndDate = newEnd;
        if (dto.Status.HasValue) task.Status = dto.Status.Value;
        task.ResponsibleStudentId = dto.ResponsibleStudentId ?? task.ResponsibleStudentId;

        await _context.SaveChangesAsync();
        return task;
    }

    public async Task DeleteAsync(Guid studentId, Guid subjectId, Guid taskId, bool cascade)
    {
        var student = await _context.Students
            .Include(s => s.Team)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new InvalidOperationException("студент не найден");

        if (student.Team == null || student.Team.SubjectId != subjectId)
        {
            throw new UnauthorizedAccessException("студент не состоит в команде предмета");
        }

        var task = await _context.Tasks
            .Include(t => t.Children)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new InvalidOperationException("задача не найдена");

        if (task.TeamId != student.Team.Id)
        {
            throw new UnauthorizedAccessException("нельзя удалять задачу другой команды");
        }

        if (!cascade && task.Children.Any())
        {
            throw new InvalidOperationException("у задачи есть потомки, включите каскадное удаление");
        }

        var tasksToDelete = new List<Task_>();
        CollectWithChildren(task, tasksToDelete);
        _context.Tasks.RemoveRange(tasksToDelete);
        await _context.SaveChangesAsync();
    }

    private static void CollectWithChildren(Task_ task, List<Task_> buffer)
    {
        buffer.Add(task);
        foreach (var child in task.Children)
        {
            CollectWithChildren(child, buffer);
        }
    }

    private static void ValidateTaskTiming(DateTime start, DateTime end, Project project, Task_? parentTask)
    {
        if (start < DateTime.UtcNow.Date)
        {
            throw new InvalidOperationException("дата начала задачи не может быть в прошлом");
        }

        if (end < start)
        {
            throw new InvalidOperationException("окончание задачи раньше начала");
        }

        if (start < project.StartDate || end > project.EndDate)
        {
            throw new InvalidOperationException("даты задачи должны быть внутри дат проекта");
        }

        if (parentTask != null)
        {
            if (start < parentTask.StartDate || end > parentTask.EndDate)
            {
                throw new InvalidOperationException("даты задачи должны быть внутри дат родительской задачи");
            }
        }
        else
        {
            if (end > project.Subject.EndDate)
            {
                throw new InvalidOperationException("дата окончания задачи не должна выходить за рамки предмета");
            }
        }
    }

    private async Task EnsureStudentInTeam(Guid studentId, Guid teamId)
    {
        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeamId == teamId);

        if (student == null)
        {
            throw new InvalidOperationException("ответственный должен быть из команды задачи");
        }
    }
}


