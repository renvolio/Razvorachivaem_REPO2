using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.DTOs.Task;
using Revers_planing.Models;
using Revers_planing.Services;

namespace Revers_planing.Controllers;

[ApiController]
[Route("api/subjects/{subjectId:guid}/projects/{projectId:guid}/tasks")]
[Authorize]
public class TaskController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ApplicationDbContext _context;

    public TaskController(ITaskService taskService, ApplicationDbContext context)
    {
        _taskService = taskService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid subjectId, Guid projectId)
    {
        if (User.IsInRole("Teacher"))
        {
            var teacherId = GetUserId();
            var tasks = await _taskService.GetByProjectForTeacherAsync(projectId, subjectId, teacherId);
            return Ok(tasks.Select(ToDto));
        }

        // Student: если студент ещё не в команде предмета, просто возвращаем пустой список
        var team = await TryGetStudentTeam(subjectId);
        if (team == null)
        {
            return Ok(Array.Empty<TaskDTO>());
        }

        var teamTasks = await _taskService.GetByProjectForTeamAsync(projectId, team.Id);
        return Ok(teamTasks.Select(ToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Create(Guid subjectId, Guid projectId, [FromBody] CreateTaskDTO dto)
    {
        var studentId = GetUserId();
        var task = await _taskService.CreateAsync(studentId, subjectId, projectId, dto);
        return Ok(ToDto(task));
    }

    [HttpPut("{taskId:guid}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Update(Guid subjectId, Guid projectId, Guid taskId, [FromBody] UpdateTaskDTO dto)
    {
        var studentId = GetUserId();
        var task = await _taskService.UpdateAsync(studentId, subjectId, projectId, taskId, dto);
        return Ok(ToDto(task));
    }

    [HttpPut("{taskId:guid}/coords")]
    [Authorize]
    public async Task<IActionResult> UpdateCoordinates(Guid projectId, Guid taskId, [FromBody] UpdateCoordsDTO dto)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return NotFound();

        if (task.ProjectId != projectId) return BadRequest("Wrong project");
        task.X = dto.X;
        task.Y = dto.Y;
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{taskId:guid}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Delete(Guid subjectId, Guid projectId, Guid taskId, [FromQuery] bool cascade = false)
    {
        var studentId = GetUserId();
        await _taskService.DeleteAsync(studentId, subjectId, projectId, taskId, cascade);
        return NoContent();
    }

    private Guid GetUserId()
    {
        var userId = User.FindFirst("userId")?.Value;
        if (userId == null) throw new UnauthorizedAccessException("пользователя нет в токене");
        return Guid.Parse(userId);
    }

    private async Task<Team?> TryGetStudentTeam(Guid subjectId)
    {
        var studentId = GetUserId();
        var student = await _context.Students
            .Include(s => s.Team)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new InvalidOperationException("студент не найден");

        if (student.Team == null || student.Team.SubjectId != subjectId)
        {
            return null;
        }

        return student.Team;
    }

    private static TaskDTO ToDto(Task_ task) => new()
    {
        Id = task.Id,
        Name = task.Name,
        Description = task.Description,
        DeadlineAssessment = task.DeadlineAssessment,
        EndDate = task.EndDate,
        StartDate = task.StartDate,
        X = task.X,
        Y = task.Y,
        TeamId = task.TeamId,
        TeamName = task.Team?.Name,
        TeamNumber = task.Team?.Number ?? 0,
        ProjectId = task.ProjectId,
        ParentTaskId = task.ParentTaskId,
        Status = task.Status,
        ResponsibleStudentId = task.ResponsibleStudentId,
        ResponsibleStudentName = task.ResponsibleStudent?.Name,
        ResponsibleStudentEmail = task.ResponsibleStudent?.Email
    };
}


