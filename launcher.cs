using System;
using System.Diagnostics;

class Program {
    static void Main() {
        Process.Start(new ProcessStartInfo {
            FileName = "msedge.exe",
            Arguments = "--app=\"https://nm-hr-smoky.vercel.app\"",
            UseShellExecute = true
        });
    }
}
