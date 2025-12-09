using Revers_planing.DTOs.Task;
using Revers_planing.Models;

namespace Revers_planing.Services;

public interface ITaskService
{
    public Task<IEnumerable<Task_>> GetByProjectForTeamAsync(Guid projectId, Guid teamId);
    public Task<Task_> CreateAsync(Guid studentId, Guid subjectId, Guid projectId, CreateTaskDTO dto);
    public Task<Task_> UpdateAsync(Guid studentId, Guid subjectId, Guid taskId, UpdateTaskDTO dto);
    public Task DeleteAsync(Guid studentId, Guid subjectId, Guid taskId, bool cascade);
}


