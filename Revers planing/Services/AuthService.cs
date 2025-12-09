using Microsoft.EntityFrameworkCore;
using Revers_planing.Data;
using Revers_planing.Models;

namespace Revers_planing.Services;



public class AuthService : IAuthService
{
    private readonly IPasswordHasher _passwordHasher;
    private readonly ApplicationDbContext _context;
    private readonly IJWTProvider _jwtProvider;
    public AuthService(IPasswordHasher passwordHasher, ApplicationDbContext context, IJWTProvider jwtProvider)
    {
        _passwordHasher = passwordHasher;
        _context = context;
        _jwtProvider = jwtProvider;
    }

    public async Task<User> Register(string userName, string email, string password, bool isTeacher, string? position = null, int? groupNumber = null)
    {
        var existingUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);
        
        if (existingUser != null)
        {
            throw new InvalidOperationException("нельзя использовать такой емаил, он занят");
        }

        var hashedPassword = _passwordHasher.Generate(password);

        User newUser;
        if (isTeacher)
        {
            newUser = new Teacher
            {
                Id = Guid.NewGuid(),
                Name = userName,
                Email = email,
                PasswordHash = hashedPassword,
                Position = position ?? string.Empty
            };
            await _context.Teachers.AddAsync((Teacher)newUser);
        }
        else
        {
            if (!groupNumber.HasValue)
            {
                throw new InvalidOperationException("Судент должен указывать свою группу ");
            }

            var student = new Student
            {
                Id = Guid.NewGuid(),
                Name = userName,
                Email = email,
                PasswordHash = hashedPassword,
                GroupNumber = groupNumber.Value
            };
            newUser = student;
            await _context.Students.AddAsync(student);
        }

        await _context.SaveChangesAsync();
        return newUser;
    }

    public async Task<string> Login(string email, string password, int? groupNumber)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email) ?? throw new Exception("пользователь не найден");


    // проверяем пароль 
    var result = _passwordHasher.Verify(password, user.PasswordHash);

        if (result == false)
        {
            throw new Exception("не правильный пароль"); 
        }

        string role;
        var teacher = await _context.Teachers.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == user.Id);
        
        if (teacher != null)
        {
            role = "Teacher";
        }
        else
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == user.Id) ?? throw new Exception("Студент не найден");

            if (!groupNumber.HasValue)
            {
                throw new InvalidOperationException(" нужно указать номер группы для входа студента");
            }

            if (student.GroupNumber == 0)
            {
                student.GroupNumber = groupNumber.Value;
                await _context.SaveChangesAsync();
            }
            else if (student.GroupNumber != groupNumber.Value)
            {
                throw new InvalidOperationException("номер группы не совпадает с сохраненным");
            }

            role = "Student";
        }

    // генерируем токен
    var token = _jwtProvider.GenerateToken(user, role);
    return token;
    } 
}