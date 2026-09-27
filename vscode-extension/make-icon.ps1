Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(128, 128)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$bgColor = [System.Drawing.Color]::FromArgb(255, 13, 17, 23)
$g.Clear($bgColor)

$blueColor = [System.Drawing.Color]::FromArgb(255, 47, 129, 247)
$brush = New-Object System.Drawing.SolidBrush($blueColor)

$shieldPts = New-Object System.Drawing.PointF[] 6
$shieldPts[0] = New-Object System.Drawing.PointF(64, 10)
$shieldPts[1] = New-Object System.Drawing.PointF(16, 30)
$shieldPts[2] = New-Object System.Drawing.PointF(16, 64)
$shieldPts[3] = New-Object System.Drawing.PointF(64, 118)
$shieldPts[4] = New-Object System.Drawing.PointF(112, 64)
$shieldPts[5] = New-Object System.Drawing.PointF(112, 30)

$g.FillPolygon($brush, $shieldPts)

$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 6)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$checkPts = New-Object System.Drawing.PointF[] 3
$checkPts[0] = New-Object System.Drawing.PointF(42, 64)
$checkPts[1] = New-Object System.Drawing.PointF(57, 80)
$checkPts[2] = New-Object System.Drawing.PointF(86, 48)

$g.DrawLines($pen, $checkPts)
$g.Dispose()

$bmp.Save('H:\Vibesec\vscode-extension\media\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host 'Icon created successfully'
