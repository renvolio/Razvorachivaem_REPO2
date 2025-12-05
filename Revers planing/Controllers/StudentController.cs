using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Revers_planing.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student")]
public class StudentController : ControllerBase
{
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = "только для студентов" });
    }

    [HttpGet("info")]
    public IActionResult GetInfo()
    {
        return Ok(new { role = "Student", message = " ТЫ студент, авторизация" });
    }
}

