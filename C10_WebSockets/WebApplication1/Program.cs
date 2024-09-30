using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllersWithViews();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

var webSocketOptions = new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromMinutes(2)
};
app.UseWebSockets(webSocketOptions);

var webSockets = new ConcurrentDictionary<WebSocket, WebSocket>();

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ws")
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            var socket = await context.WebSockets.AcceptWebSocketAsync();
            webSockets[socket] = socket;

            var buffer = new byte[1024 * 4];
            WebSocketReceiveResult result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

            while (!result.CloseStatus.HasValue)
            {
                var startTime = DateTime.Now;
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);

                foreach (var ws in webSockets.Keys)
                {
                    if (ws != socket && ws.State == WebSocketState.Open)
                    {
                        await ws.SendAsync(Encoding.UTF8.GetBytes(message), result.MessageType, result.EndOfMessage, CancellationToken.None);
                    }
                }
                var endTime = DateTime.Now;
                var elapsedTime = endTime - startTime;
                logger.LogInformation($"Message handling took {elapsedTime.TotalMilliseconds} ms");
                result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }

            webSockets.TryRemove(socket, out _);
            await socket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
        }
        else
        {
            context.Response.StatusCode = 400;
        }
    }
    else
    {
        await next();
    }
});

app.Run();
