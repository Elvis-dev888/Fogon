Add-Type -AssemblyName System.Drawing

$sourcePath = "public/Kiosko.jpg"
if (!(Test-Path $sourcePath)) {
    Write-Error "No se encontró $sourcePath"
    exit 1
}

$srcImage = [System.Drawing.Bitmap]::FromFile($sourcePath)

# 1. Recorte cuadrado central (784 x 784)
$dim = [Math]::Min($srcImage.Width, $srcImage.Height)
$cropX = [int](($srcImage.Width - $dim) / 2)
$cropY = [int](($srcImage.Height - $dim) / 2)

$squareCrop = New-Object System.Drawing.Bitmap($dim, $dim, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCrop = [System.Drawing.Graphics]::FromImage($squareCrop)
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gCrop.DrawImage($srcImage, (New-Object System.Drawing.Rectangle(0, 0, $dim, $dim)), (New-Object System.Drawing.Rectangle($cropX, $cropY, $dim, $dim)), [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()

# Helper para redimensionar
function Resize-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [bool]$centerInCanvas = $false,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::FromArgb(21, 21, 21),
        [float]$scaleFactor = 1.0
    )
    $dest = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($centerInCanvas) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $g.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()

        $drawDim = [int]([Math]::Min($width, $height) * $scaleFactor)
        $drawX = [int](($width - $drawDim) / 2)
        $drawY = [int](($height - $drawDim) / 2)
        $g.DrawImage($source, (New-Object System.Drawing.Rectangle($drawX, $drawY, $drawDim, $drawDim)), 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    } else {
        $g.DrawImage($source, (New-Object System.Drawing.Rectangle(0, 0, $width, $height)), 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    }
    $g.Dispose()
    return $dest
}

# Helper para redondear imagen (círculo con antialiasing)
function Create-CircleImage {
    param([System.Drawing.Bitmap]$source, [int]$size)
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($source, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)), 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $path.Dispose()
    return $dest
}

# Helper para guardar archivo .ico con múltiples resoluciones (256, 128, 64, 48, 32, 16)
function Save-IcoFile {
    param([System.Drawing.Bitmap]$source, [string]$outputPath)
    $sizes = @(256, 128, 64, 48, 32, 16)
    $pngStreams = @()

    foreach ($s in $sizes) {
        $resized = Resize-Image -source $source -width $s -height $s
        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngStreams += ,@($s, $ms.ToArray())
        $resized.Dispose()
        $ms.Dispose()
    }

    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR Header
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = ICO)
    $bw.Write([uint16]$pngStreams.Count) # Image count

    $offset = 6 + ($pngStreams.Count * 16)

    # ICONDIRENTRY Headers
    foreach ($entry in $pngStreams) {
        $s = $entry[0]
        $bytes = $entry[1]
        $w = if ($s -ge 256) { [byte]0 } else { [byte]$s }
        $h = if ($s -ge 256) { [byte]0 } else { [byte]$s }

        $bw.Write($w) # Width
        $bw.Write($h) # Height
        $bw.Write([byte]0) # Color palette
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$bytes.Length) # Image size in bytes
        $bw.Write([uint32]$offset) # Offset
        $offset += $bytes.Length
    }

    # Image data
    foreach ($entry in $pngStreams) {
        $bytes = $entry[1]
        $bw.Write($bytes)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
}

Write-Host "Generando íconos para Windows (Electron)..."
if (!(Test-Path "build")) { New-Item -ItemType Directory -Path "build" }
if (!(Test-Path "build/appx")) { New-Item -ItemType Directory -Path "build/appx" }

# Guardar build/icon.ico y build/icon.png
Save-IcoFile -source $squareCrop -outputPath "build/icon.ico"
$icon512 = Resize-Image -source $squareCrop -width 512 -height 512
$icon512.Save("build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon256 = Resize-Image -source $squareCrop -width 256 -height 256
$icon256.Save("build/icon-256.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Mosaicos para Windows AppX (Store)
$storeLogo = Resize-Image -source $squareCrop -width 50 -height 50
$storeLogo.Save("build/appx/StoreLogo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$sq44 = Resize-Image -source $squareCrop -width 44 -height 44
$sq44.Save("build/appx/Square44x44Logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$sq71 = Resize-Image -source $squareCrop -width 71 -height 71
$sq71.Save("build/appx/Square71x71Logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$sq150 = Resize-Image -source $squareCrop -width 150 -height 150
$sq150.Save("build/appx/Square150x150Logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$sq310 = Resize-Image -source $squareCrop -width 310 -height 310
$sq310.Save("build/appx/LargeTile.png", [System.Drawing.Imaging.ImageFormat]::Png)

$wide310 = Resize-Image -source $squareCrop -width 310 -height 150 -centerInCanvas $true -scaleFactor 0.8
$wide310.Save("build/appx/Wide310x150Logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$splashWin = Resize-Image -source $squareCrop -width 620 -height 300 -centerInCanvas $true -scaleFactor 0.65
$splashWin.Save("build/appx/SplashScreen.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Generando íconos para Web..."
Save-IcoFile -source $squareCrop -outputPath "public/favicon.ico"
$icon192 = Resize-Image -source $squareCrop -width 192 -height 192
$icon192.Save("public/icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Save("public/icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$appleTouch = Resize-Image -source $squareCrop -width 180 -height 180
$appleTouch.Save("public/apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Generando íconos para Android (Capacitor)..."
$androidRes = "android/app/src/main/res"

$androidDensities = @{
    "mipmap-mdpi"    = @{ icon = 48; foreground = 108 }
    "mipmap-hdpi"    = @{ icon = 72; foreground = 162 }
    "mipmap-xhdpi"   = @{ icon = 96; foreground = 216 }
    "mipmap-xxhdpi"  = @{ icon = 144; foreground = 324 }
    "mipmap-xxxhdpi" = @{ icon = 192; foreground = 432 }
}

foreach ($density in $androidDensities.Keys) {
    $dir = "$androidRes/$density"
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    $cfg = $androidDensities[$density]

    # ic_launcher.png (cuadrado con bordes limpios)
    $sq = Resize-Image -source $squareCrop -width $cfg.icon -height $cfg.icon
    $sq.Save("$dir/ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $sq.Dispose()

    # ic_launcher_round.png (círculo)
    $round = Create-CircleImage -source $squareCrop -size $cfg.icon
    $round.Save("$dir/ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $round.Dispose()

    # ic_launcher_foreground.png (para Adaptive Icons de Android)
    $fg = Resize-Image -source $squareCrop -width $cfg.foreground -height $cfg.foreground -centerInCanvas $true -bgColor ([System.Drawing.Color]::Transparent) -scaleFactor 0.72
    $fg.Save("$dir/ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()
}

# Splashes de Android
$splashDensities = @{
    "drawable-land-mdpi"    = @{ w = 480; h = 320 }
    "drawable-land-hdpi"    = @{ w = 800; h = 480 }
    "drawable-land-xhdpi"   = @{ w = 1280; h = 720 }
    "drawable-land-xxhdpi"  = @{ w = 1600; h = 960 }
    "drawable-land-xxxhdpi" = @{ w = 1920; h = 1280 }
    "drawable-port-mdpi"    = @{ w = 320; h = 480 }
    "drawable-port-hdpi"    = @{ w = 480; h = 800 }
    "drawable-port-xhdpi"   = @{ w = 720; h = 1280 }
    "drawable-port-xxhdpi"  = @{ w = 960; h = 1600 }
    "drawable-port-xxxhdpi" = @{ w = 1280; h = 1920 }
}

foreach ($splashName in $splashDensities.Keys) {
    $dir = "$androidRes/$splashName"
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    $cfg = $splashDensities[$splashName]
    $sp = Resize-Image -source $squareCrop -width $cfg.w -height $cfg.h -centerInCanvas $true -scaleFactor 0.4
    $sp.Save("$dir/splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $sp.Dispose()
}

if (Test-Path "$androidRes/drawable") {
    $spDefault = Resize-Image -source $squareCrop -width 480 -height 800 -centerInCanvas $true -scaleFactor 0.4
    $spDefault.Save("$androidRes/drawable/splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $spDefault.Dispose()
}

$squareCrop.Dispose()
$srcImage.Dispose()

Write-Host "¡Todos los íconos se han generado y actualizado con éxito!"

