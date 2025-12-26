using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.DTOs.Task;
using Revers_planing.Models;

namespace Revers_planing.Services;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _context;
    private ITaskService _taskServiceImplementation;

    public TaskService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Task_>> GetByProjectForTeamAsync(Guid projectId, Guid teamId)
    {
        return await _context.Tasks
            .Include(t => t.Children)
            .Include(t => t.ResponsibleStudent)
            .Where(t => t.ProjectId == projectId && t.TeamId == teamId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IEnumerable<Task_>> GetByProjectForTeacherAsync(Guid projectId, Guid subjectId, Guid teacherId)
    {
        var project = await _context.Projects
            .Include(p => p.Subject)
            .ThenInclude(s => s.Teachers)
            .FirstOrDefaultAsync(p => p.Id == projectId && p.SubjectId == subjectId)
            ?? throw new InvalidOperationException("проект не найден");

        if (!project.Subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не привязан к предмету");
        }

        return await _context.Tasks
            .Include(t => t.Children)
            .Include(t => t.ResponsibleStudent)
            .Where(t => t.ProjectId == projectId)
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

        var calculatedStartTime = dto.EndDate.Subtract(dto.DeadlineAssessment);

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
        }

        ValidateTaskTiming(calculatedStartTime, dto.EndDate, project, parentTask);

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
            StartDate = calculatedStartTime,
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

    public async Task<Task_> UpdateAsync(Guid studentId, Guid subjectId, Guid projectId, Guid taskId, UpdateTaskDTO dto)
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

        if (task.ProjectId != projectId)
        {
            throw new InvalidOperationException("задача не относится к указанному проекту");
        }

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
        if (dto.Status.HasValue) task.Status = dto.Status.Value;

        var newDuration = dto.DeadlineAssessment ?? task.DeadlineAssessment;
        var newEndDate = dto.EndDate ?? task.EndDate;
        var newStartDate = newEndDate.Subtract(newDuration);

        var project = await _context.Projects.Include(p => p.Subject)
            .FirstOrDefaultAsync(p => p.Id == (dto.ProjectId ?? task.ProjectId))
            ?? throw new InvalidOperationException("проект не найден");

        Task_? parentTask = null;
        if (dto.ParentTaskId.HasValue)
        {
            parentTask = await _context.Tasks.FindAsync(dto.ParentTaskId.Value);
            // Валидация, что родитель из того же проекта/команды (желательно добавить)
            if (parentTask != null && parentTask.ProjectId != project.Id)
                throw new InvalidOperationException("Родительская задача из другого проекта");
        }

        ValidateTaskTiming(newStartDate, newEndDate, project, parentTask);

        task.DeadlineAssessment = newDuration;
        task.EndDate = newEndDate;
        task.StartDate = newStartDate;
        task.ProjectId = project.Id;
        task.ParentTaskId = dto.ParentTaskId;

        if (dto.ResponsibleStudentId.HasValue)
            task.ResponsibleStudentId = dto.ResponsibleStudentId;

        await _context.SaveChangesAsync();
        return task;
    }

    public async Task DeleteAsync(Guid studentId, Guid subjectId, Guid projectId, Guid taskId, bool cascade)
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

        if (task.ProjectId != projectId)
        {
            throw new InvalidOperationException("задача не относится к указанному проекту");
        }

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
        //if (start < DateTime.UtcNow.Date)
        //{
        //    throw new InvalidOperationException($"Мало времени. Чтобы успеть к {end:d}, задачу нужно было начать {start:d} (которая в прошлом). Нужно либо увеличить дедлайн, либо сократить время выполнения");
        //}

        if (start < project.StartDate)
        {
            throw new InvalidOperationException($"Расчетная дата начала ({start:d}) раньше старта проекта ({project.StartDate:d}).");
        }

        if (end > project.EndDate)
        {
            throw new InvalidOperationException($"Дедлайн задачи ({end:d}) позже окончания проекта ({project.EndDate:d}).");
        }

        if (parentTask != null)
        {
            if (end > parentTask.StartDate)
            {
                throw new InvalidOperationException($"Подзадача должна быть завершена до начала родительской задачи (Дедлайн родителя: {parentTask.StartDate:g}).");
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


