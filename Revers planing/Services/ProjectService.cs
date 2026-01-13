using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.DTOs.Project;
using Revers_planing.Models;

namespace Revers_planing.Services;

public class ProjectService : IProjectService
{
    private readonly ApplicationDbContext _context;

    public ProjectService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Project> CreateAsync(Guid teacherId, Guid subjectId, CreateProjectDTO dto)
    {
        var subject = await _context.Subjects
            .Include(s => s.Teachers)
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException("предмет не найден");

        if (!subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не привязан к предмету");
        }

        ValidateProjectDates(dto.StartDate, dto.EndDate, subject);

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            SubjectId = subjectId,
            TeacherId = teacherId
        };

        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();
        return project;
    }

    public async Task<IEnumerable<Project>> GetBySubjectForTeacherAsync(Guid teacherId, Guid subjectId)
    {
        var subject = await _context.Subjects
            .Include(s => s.Teachers)
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException("предмет не найден");

        if (!subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не привязан к предмету");
        }

        return await _context.Projects
            .Where(p => p.SubjectId == subjectId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IEnumerable<Project>> GetBySubjectForStudentAsync(Guid subjectId, int groupNumber)
    {
        var subject = await _context.Subjects
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException("предмет не найден");

        if (!subject.AllowedGroups.Contains(groupNumber))
        {
            throw new UnauthorizedAccessException("нет доступа к проектам предмета");
        }

        return await _context.Projects
            .Where(p => p.SubjectId == subjectId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Project> UpdateAsync(Guid teacherId, Guid subjectId, Guid projectId, UpdateProjectDTO dto)
    {
        var project = await _context.Projects
            .Include(p => p.Subject)
            .ThenInclude(s => s.Teachers)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new InvalidOperationException("проект не найден");

        if (project.SubjectId != subjectId)
        {
            throw new InvalidOperationException("проект не относится к указанному предмету");
        }

        if (!project.Subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не привязан к предмету");
        }

        // Нельзя менять даты проекта, если к нему уже привязаны задачи
        if (dto.StartDate.HasValue || dto.EndDate.HasValue)
        {
            var hasTasks = await _context.Tasks.AsNoTracking()
                .AnyAsync(t => t.ProjectId == projectId);
            if (hasTasks)
            {
                throw new InvalidOperationException("нельзя менять даты проекта, к которому уже привязаны задачи");
            }
        }

        if (dto.Name != null) project.Name = dto.Name;
        if (dto.Description != null) project.Description = dto.Description;
        if (dto.StartDate.HasValue || dto.EndDate.HasValue)
        {
            var newStart = dto.StartDate ?? project.StartDate;
            var newEnd = dto.EndDate ?? project.EndDate;
            ValidateProjectDates(newStart, newEnd, project.Subject);
            project.StartDate = newStart;
            project.EndDate = newEnd;
        }

        await _context.SaveChangesAsync();
        return project;
    }

    public async Task DeleteAsync(Guid teacherId, Guid subjectId, Guid projectId)
    {
        var project = await _context.Projects
            .Include(p => p.Subject)
            .ThenInclude(s => s.Teachers)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new InvalidOperationException("проект не найден");

        if (project.SubjectId != subjectId)
        {
            throw new InvalidOperationException("проект не относится к указанному предмету");
        }

        if (!project.Subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не привязан к предмету");
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();
    }

    private static void ValidateProjectDates(DateTime startDate, DateTime endDate, Subject subject)
    {
        if (endDate < startDate)
        {
            throw new InvalidOperationException("дата окончания проекта раньше даты начала");
        }

        if (startDate < subject.StartDate || endDate > subject.EndDate)
        {
            throw new InvalidOperationException("даты проекта должны быть внутри дат предмета");
        }
    }
}


