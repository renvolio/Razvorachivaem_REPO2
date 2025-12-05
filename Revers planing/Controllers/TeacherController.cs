using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Revers_planing.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Teacher")]
public class TeacherController : ControllerBase
{
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = " только для учителей" });
    }

    [HttpGet("info")]
    public IActionResult GetInfo()
    {
        return Ok(new { role = "Teacher", message = "Ты тичер , авторизац." });
    }
}

