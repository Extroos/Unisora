Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outputPath = $args[0]
if (-not $outputPath) {
    Write-Error "Missing output path argument."
    Exit 1
}

try {
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    
    $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bmp.Dispose()
    Write-Output "Screenshot saved to $outputPath"
} catch {
    Write-Error $_.Exception.Message
    Exit 1
}
