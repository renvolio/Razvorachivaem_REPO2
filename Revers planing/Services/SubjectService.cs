using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.DTOs.Subject;
using Revers_planing.Models;

namespace Revers_planing.Services;

public class SubjectService : ISubjectService
{
    private readonly ApplicationDbContext _context;

    public SubjectService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Subject> CreateAsync(Guid teacherId, CreateSubjectDTO dto)
    {
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Id == teacherId)
                      ?? throw new InvalidOperationException(" учитель не найден");

        ValidateSubjectDates(dto.StartDate, dto.EndDate);

        var subject = new Subject
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Discription = dto.Discription,
            AllowedGroups = dto.AllowedGroups ?? new List<int>()
        };

        subject.Teachers.Add(teacher);

        await _context.Subjects.AddAsync(subject);
        await _context.SaveChangesAsync();
        return subject;
    }

    public async Task<IEnumerable<Subject>> GetForTeacherAsync(Guid teacherId)
    {
        return await _context.Subjects
            .Where(s => s.Teachers.Any(t => t.Id == teacherId))
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IEnumerable<Subject>> GetForStudentAsync(Guid studentId, int groupNumber)
    {
        var studentExists = await _context.Students.AsNoTracking().AnyAsync(s => s.Id == studentId);
        if (!studentExists)
        {
            throw new InvalidOperationException("студент  не найден");
        }

        return await _context.Subjects
            .Where(s => s.AllowedGroups.Contains(groupNumber))
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Subject?> GetByIdAsync(Guid subjectId)
    {
        return await _context.Subjects
            .Include(s => s.Teachers)
            .Include(s => s.Projects)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == subjectId);
    }

    public async Task<Subject> UpdateAsync(Guid subjectId, UpdateSubjectDTO dto, Guid teacherId)
    {
        var subject = await _context.Subjects
            .Include(s => s.Teachers)
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException(" предмет не найден");

        if (!subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException(" учитель не имеет доступа к предмету");
        }

        // Нельзя менять даты предмета, если к его проектам уже привязаны задачи
        if (dto.StartDate.HasValue || dto.EndDate.HasValue)
        {
            var hasTasks = await _context.Tasks.AsNoTracking()
                .Include(t => t.Project)
                .AnyAsync(t => t.Project != null && t.Project.SubjectId == subjectId);
            if (hasTasks)
            {
                throw new InvalidOperationException("нельзя менять даты предмета, к которому уже привязаны задачи в проектах");
            }
        }

        var newStart = dto.StartDate ?? subject.StartDate;
        var newEnd = dto.EndDate ?? subject.EndDate;
        ValidateSubjectDates(newStart, newEnd);

        if (dto.Name != null) subject.Name = dto.Name;
        subject.StartDate = newStart;
        subject.EndDate = newEnd;
        if (dto.Discription != null) subject.Discription = dto.Discription;
        if (dto.AllowedGroups != null) subject.AllowedGroups = dto.AllowedGroups;

        await _context.SaveChangesAsync();
        return subject;
    }

    public async Task DeleteAsync(Guid subjectId, Guid teacherId)
    {
        var subject = await _context.Subjects
            .Include(s => s.Teachers)
            .Include(s => s.Teams)
            .ThenInclude(t => t.Students)
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException(" предмет не найден");

        if (!subject.Teachers.Any(t => t.Id == teacherId))
        {
            throw new UnauthorizedAccessException("учитель не имеет доступа к предмету");
        }
        foreach (var team in subject.Teams)
        {
            if (team.Students != null)
            {
                foreach (var student in team.Students)
                {
                    student.Team = null;
                }
            }
        }
        _context.Subjects.Remove(subject);
        await _context.SaveChangesAsync();
    }

    public async Task<(Team Team, Subject Subject)> JoinSubjectAsync(Guid subjectId, Guid studentId, int teamNumber, string? teamName, int groupNumber)
    {
        var subject = await _context.Subjects
            .Include(s => s.Teams)
            .Include(s => s.Students)
            .FirstOrDefaultAsync(s => s.Id == subjectId)
            ?? throw new InvalidOperationException("предмет не найден");

        if (!subject.AllowedGroups.Contains(groupNumber))
        {
            throw new UnauthorizedAccessException("группа не может зайти в этот предмет");
        }

        var student = await _context.Students
            .Include(s => s.Team)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new InvalidOperationException("студент не найден");

        if (student.Team != null && student.Team.SubjectId != subjectId)
        {
            throw new InvalidOperationException("студе  нт уже состоит в команде другого предмета");
        }

        var team = await _context.Teams
            .Include(t => t.Students)
            .FirstOrDefaultAsync(t => t.SubjectId == subjectId && t.Number == teamNumber);

        if (team == null)
        {
            team = new Team
            {
                Id = Guid.NewGuid(),
                Number = teamNumber,
                Name = teamName,
                SubjectId = subjectId
            };
            await _context.Teams.AddAsync(team);
            subject.Teams.Add(team);
        }

        if (!team.Students.Any(s => s.Id == student.Id))
        {
            team.Students.Add(student);
        }

        if (!subject.Students.Any(s => s.Id == student.Id))
        {
            subject.Students.Add(student);
        }

        student.Team = team;

        await _context.SaveChangesAsync();
        return (team, subject);
    }

    private static void ValidateSubjectDates(DateTime startDate, DateTime endDate)
    {
        if (endDate < startDate)
        {
            throw new InvalidOperationException("дата окончания предмета раньше даты начала");
        }
    }
}


