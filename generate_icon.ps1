Add-Type -AssemblyName System.Drawing

$path = "c:\Users\GautamkumarRajkumar\Downloads\pause_extension_TIMER_WORKING\icon128.png"
$width = 128
$height = 128
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Colors
$color1 = [System.Drawing.ColorTranslator]::FromHtml("#007AFF")
$color2 = [System.Drawing.ColorTranslator]::FromHtml("#5856D6")

# Gradient Brush
# LinearGradientMode.ForwardDiagonal = 2
$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $color1, $color2, 2

# Fill Rectangle
$g.FillRectangle($brush, $rect)

# Draw Text
$fontFamily = New-Object System.Drawing.FontFamily "Arial"
# FontStyle.Bold = 1, GraphicsUnit.Pixel = 2
$font = New-Object System.Drawing.Font $fontFamily, 80, 1, 2
$textBrush = [System.Drawing.Brushes]::White
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

# DrawString expects RectangleF
$rectF = New-Object System.Drawing.RectangleF 0, 0, $width, $height
$g.DrawString("P", $font, $textBrush, $rectF, $format)

$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$brush.Dispose()
$font.Dispose()

Write-Host "Icon generated at $path"
