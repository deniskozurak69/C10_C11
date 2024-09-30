using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using System.IO;

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

var taskUpdates = new ConcurrentQueue<string>();

app.MapGet("/poll", async (HttpContext context) =>
{
    var tcs = new TaskCompletionSource<bool>();
    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    var token = cts.Token;

    token.Register(() => tcs.TrySetResult(true));

    using (token.Register(() => tcs.TrySetResult(true)))
    {
        while (!taskUpdates.IsEmpty)
        {
            if (taskUpdates.TryDequeue(out var taskUpdate))
            {
                await context.Response.WriteAsync(taskUpdate);
                return;
            }
        }

        await tcs.Task;
        if (!taskUpdates.IsEmpty && taskUpdates.TryDequeue(out var Update))
        {
            await context.Response.WriteAsync(Update);
        }
    }
});

app.MapPost("/update", async (HttpContext context) =>
{
    var message = await new StreamReader(context.Request.Body).ReadToEndAsync();
    taskUpdates.Enqueue(message);
    context.Response.StatusCode = 200;
});

app.Run();
