using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Revers_planing.DTOs.Auth;
using Revers_planing.Services;

namespace Revers_planing.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDTO dto)
    {
        await _authService.Register(dto.Name, dto.Email, dto.Password, dto.IsTeacher, dto.Position);
        return Ok(new { message = "ok" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDTO dto, HttpContext context)
    {
        var token = await _authService.Login(dto.Email, dto.Password);
        context.Response.Cookies.Append("cookie", token); 

        return Ok(new { token });
    }
}