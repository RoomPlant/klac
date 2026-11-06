# Splits the transparent 0-second poster into three aligned 448x672 layers for
# the final scene: the figures, Batman's raised arm and the flamingo's neck.
# CSS rotates only the arm and neck, so the rest stays exactly in the first-frame pose.
# Run after tools/create-loader-poster.ps1:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\create-pose-layers.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'assets'

function New-Shape([int[]]$xy) {
    $points = for ($i = 0; $i -lt $xy.Length; $i += 2) { New-Object Drawing.Point $xy[$i], $xy[$i + 1] }
    $path = New-Object Drawing.Drawing2D.GraphicsPath
    $path.AddPolygon([Drawing.Point[]]$points)
    $path
}

# Source-pixel polygons. Each moving layer reaches about 20 px below the place
# where it is removed from the figures; that overlap hides the joint while rotating.
# Batman's raised right arm, shoulder pivot (210, 203).
$arm = New-Shape @(194,196, 204,172, 240,150, 245,124, 299,124, 299,162, 262,180, 257,202, 240,214, 214,222)
$armCut = New-Shape @(204,175, 240,150, 245,124, 299,124, 299,162, 262,180, 256,200, 238,211)
# Flamingo head and neck, neck-base pivot (352, 312).
$neck = New-Shape @(304,182, 373,182, 368,250, 364,300, 370,322, 336,322, 320,300, 320,245, 304,242)
$neckCut = New-Shape @(304,182, 373,182, 368,250, 364,300, 320,300, 320,245, 304,242)

$poster = [Drawing.Bitmap]::FromFile((Join-Path $assets 'loader-dance.poster.png'))
try {
    if ($poster.Width -ne 448 -or $poster.Height -ne 672) { throw 'Expected a 448x672 poster.' }
    function Save-Layer([string]$name, [scriptblock]$clip) {
        $layer = New-Object Drawing.Bitmap 448, 672, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [Drawing.Graphics]::FromImage($layer)
        try {
            $g.Clear([Drawing.Color]::Transparent)
            $g.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
            & $clip $g
            $g.DrawImage($poster, 0, 0, 448, 672)
        } finally { $g.Dispose() }
        $tmp = Join-Path $assets "$name.tmp.png"
        try { $layer.Save($tmp, [Drawing.Imaging.ImageFormat]::Png) } finally { $layer.Dispose() }
        Move-Item -Force $tmp (Join-Path $assets "$name.png")
    }
    Save-Layer 'pose-body' {
        param($g)
        $region = New-Object Drawing.Region (New-Object Drawing.Rectangle 0, 0, 448, 672)
        $region.Exclude($armCut); $region.Exclude($neckCut)
        $g.Clip = $region
    }
    Save-Layer 'pose-arm' { param($g) $g.Clip = New-Object Drawing.Region $arm }
    Save-Layer 'pose-neck' { param($g) $g.Clip = New-Object Drawing.Region $neck }
} finally { $poster.Dispose() }
Write-Output 'Pose layers: assets/pose-body.png, pose-arm.png, pose-neck.png'
