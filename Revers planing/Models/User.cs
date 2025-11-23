namespace Revers_planing;

public class User
{
    public Guid Id { get; set; } 
    public string Name { get; set; } 
    public string Email { get; set; } 
  //  public string PasswordHash { get; set; }  пока не знаю как его устанавливать

  void login(string email, string password)
  {
      
  }

  string getFullName() => Name;  // ?Зачем нам этот метод, если ы и так можем получить имя через гет

}