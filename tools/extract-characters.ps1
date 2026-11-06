# Reproducible cutouts from the bottom-right panel of assets/characters.png.
# Outline coordinates refer to a 2x crop of (710, 1060, 340, 410).
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class ComicMatte {
    public static void Clean(Bitmap bitmap) {
        var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var pixels = new byte[data.Stride * data.Height];
        Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
        for (int i = 0; i < pixels.Length; i += 4) {
            int b = pixels[i], g = pixels[i + 1], r = pixels[i + 2];
            // Remove residual purple panel / yellow bus, but keep black ink,
            // pink fabric, cream shirt, skin and the bird's golden legs.
            bool purple = b - r > 12 && b - g > 15 && b > 45 && r < 160;
            bool yellow = r > 180 && g > 170 && g - b > 65;
            if (purple || yellow) pixels[i + 3] = 0;
        }
        Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        bitmap.UnlockBits(data);
    }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$source = [Drawing.Image]::FromFile((Join-Path $root 'assets\characters.png'))

function Export-Cutout($name, $outline, $holes) {
    $bitmap = New-Object Drawing.Bitmap 680,820
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $path = New-Object Drawing.Drawing2D.GraphicsPath
    foreach ($polygon in (@($outline) + $holes)) {
        $points = [Drawing.PointF[]]@(
            foreach ($pair in ($polygon -split '\s+')) {
                $xy = $pair -split ','
                New-Object Drawing.PointF ([float]$xy[0]),([float]$xy[1])
            }
        )
        $path.AddPolygon($points)
    }
    $graphics.SetClip($path)
    $graphics.DrawImage($source, (New-Object Drawing.Rectangle 0,0,680,820),
        (New-Object Drawing.Rectangle 710,1060,340,410), [Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    [ComicMatte]::Clean($bitmap)
    $bitmap.Save((Join-Path $root "assets\$name.png"), [Drawing.Imaging.ImageFormat]::Png)
    $path.Dispose()
    $bitmap.Dispose()
}

try {
    Export-Cutout 'ded-betmen' @'
299,17 307,16 301,70 326,73 335,77 355,24 363,20 358,84
370,96 377,112 377,130 372,153 401,177 427,198 442,219
452,242 454,259 448,279 431,292 406,298 379,295
386,346 395,404 403,440 375,453 344,464 345,503
353,557 371,624 359,620 364,645 353,638 358,678
365,708 378,707 385,712 384,730 412,733 436,742
447,753 451,767 447,779 428,787 400,788 371,784
351,779 322,784 305,783 298,776 298,748 304,728
308,716 300,690 283,677 279,678 274,628 264,573
254,531 245,574 238,628 222,605 219,644 215,672
215,700 220,727 225,751 226,773 218,788 196,796
169,803 144,804 125,798 120,790 122,779 136,756
149,740 152,724 156,715 153,687 149,665 148,637
151,608 156,584 145,577 147,560 133,572 136,542
141,490 145,456 130,448 124,431 125,410 118,390
105,369 96,353 84,358 75,344 66,321 59,294
55,278 57,263 68,246 88,222 113,199 139,178
162,162 187,150 202,138 223,130 239,133 247,140
255,116 266,94 280,70
'@ @()
    Export-Cutout 'flamingo' @'
434,346 446,330 462,318 479,311 497,308 513,313
524,323 530,338 531,354 528,376 520,398 509,425
507,444 513,453 519,448 525,425 537,405 553,387
570,377 588,373 604,376 621,386 637,402 650,422
656,439 655,469 656,499 657,538 647,534 636,516
628,510 615,521 594,528 589,536 589,682 587,703
579,718 571,722 565,715 567,708 544,721 535,722
531,716 538,707 554,690 555,684 525,697 514,705
507,704 509,697 523,688 553,675 555,532 547,523
541,515 527,503 510,502 494,497 482,488 475,474
472,457 474,440 480,416 489,388 490,372 481,358
473,358 465,380 454,401 448,425 445,455 439,459
433,451 427,431 420,413 416,396 419,379 425,361
'@ @('566,535 576,535 577,684 568,689')
} finally {
    $source.Dispose()
}
