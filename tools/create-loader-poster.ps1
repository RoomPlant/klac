# Default: the very first frame (0 s), which is also the final frozen pose.
param([double]$Seconds = 0)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase
$root = Split-Path $PSScriptRoot -Parent
$player = New-Object System.Windows.Media.MediaPlayer
$player.IsMuted = $true
# Without scrubbing WPF ignores paused seeks and keeps whatever frame it decoded last.
$player.ScrubbingEnabled = $true
$player.Open([Uri](Join-Path $root 'assets\loader-dance.mp4'))
$player.Pause()
$deadline = [DateTime]::Now.AddSeconds(20)
while ($player.NaturalVideoWidth -eq 0 -and [DateTime]::Now -lt $deadline) {
    [Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [Windows.Threading.DispatcherPriority]::Background)
    Start-Sleep -Milliseconds 100
}
if ($player.NaturalVideoWidth -eq 0) { throw 'Windows could not decode the supplied video.' }
$player.Position = [TimeSpan]::FromSeconds($Seconds)
for ($i = 0; $i -lt 15; $i++) {
    [Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [Windows.Threading.DispatcherPriority]::Background)
    Start-Sleep -Milliseconds 100
}
$player.Pause()
$w = $player.NaturalVideoWidth
$h = $player.NaturalVideoHeight
$visual = New-Object Windows.Media.DrawingVisual
$dc = $visual.RenderOpen()
$dc.DrawVideo($player, (New-Object Windows.Rect 0,0,$w,$h))
$dc.Close()
$bitmap = New-Object Windows.Media.Imaging.RenderTargetBitmap $w,$h,96,96,([Windows.Media.PixelFormats]::Pbgra32)
$bitmap.Render($visual)
$encoder = New-Object Windows.Media.Imaging.PngBitmapEncoder
$encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
$stream = [IO.File]::Create((Join-Path $root 'assets\loader-dance.poster.png'))
try { $encoder.Save($stream) } finally { $stream.Dispose() }
Write-Output "$w x $h; duration: $($player.NaturalDuration); poster: $Seconds s"
$player.Close()
# Apply the exact same matte used by the browser to the fallback poster.
Add-Type -AssemblyName System.Drawing
$poster = Join-Path $root 'assets\loader-dance.poster.png'
$image = [Drawing.Bitmap]::FromFile($poster)
$pixels = $image.LockBits((New-Object Drawing.Rectangle 0,0,$w,$h),
    [Drawing.Imaging.ImageLockMode]::ReadWrite, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($w * $h * 4)
[Runtime.InteropServices.Marshal]::Copy($pixels.Scan0, $bytes, 0, $bytes.Length)
for ($i = 0; $i -lt $bytes.Length; $i += 4) {
    $b = $bytes[$i]; $bytes[$i] = $bytes[$i+2]; $bytes[$i+2] = $b
}
$raw = Join-Path $root 'assets\loader-poster.rgba.tmp'
try {
    [IO.File]::WriteAllBytes($raw, $bytes)
    node -e "const fs=require('fs');const b=fs.readFileSync(process.argv[1]);require(process.argv[2]).createMatte(+$w,+$h,{edgeFeather:8})(b);fs.writeFileSync(process.argv[1],b)" $raw (Join-Path $root 'matte.js')
    if ($LASTEXITCODE -ne 0) { throw 'Poster matte failed' }
    $bytes = [IO.File]::ReadAllBytes($raw)
    for ($i = 0; $i -lt $bytes.Length; $i += 4) {
        $b = $bytes[$i]; $bytes[$i] = $bytes[$i+2]; $bytes[$i+2] = $b
    }
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pixels.Scan0, $bytes.Length)
} finally {
    $image.UnlockBits($pixels)
    if (Test-Path $raw) { Remove-Item $raw }
}
$out = Join-Path $root 'assets\loader-poster.tmp.png'
try {
    $image.Save($out, [Drawing.Imaging.ImageFormat]::Png)
} finally { $image.Dispose() }
Move-Item -Force $out $poster
