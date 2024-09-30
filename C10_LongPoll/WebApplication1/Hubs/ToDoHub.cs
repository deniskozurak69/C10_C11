using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace WebApplication1.Hubs
{
    public class ToDoHub : Hub
    {
        private readonly ILogger<ToDoHub> _logger;

        public ToDoHub(ILogger<ToDoHub> logger)
        {
            _logger = logger;
        }

        public async Task SendTaskUpdate(string taskId)
        {
            var startTime = DateTime.Now;
            _logger.LogInformation("Task update received");
            await Clients.All.SendAsync("ReceiveTaskUpdate", taskId);
            _logger.LogInformation("Task update sent to all clients");
            var endTime = DateTime.Now;
            var elapsedTime = endTime - startTime;
            _logger.LogInformation($"SendTaskUpdate took {elapsedTime.TotalMilliseconds} ms");
        }
    }
}
