# Define the parameters
param (
    [string]$newProjectName,
    [string]$destinationPath
)

# Define paths
$referenceFolder = "Package.Reference.Project"
$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) { $scriptRoot = Get-Location }

# Interactive mode if no parameters provided
if (-not $newProjectName) {
    Write-Host "=== Umbraco.Community Package Bootstrapper ===" -ForegroundColor Cyan
    Write-Host ""
    $newProjectName = Read-Host "Enter project name"
    
    if (-not $newProjectName) {
        Write-Error "Project name is required."
        exit 1
    }
    
    # Default destination is ./projects relative to script location
    $destinationPath = Join-Path -Path $scriptRoot -ChildPath "projects"
    
    # Create projects folder if it doesn't exist
    if (-Not (Test-Path $destinationPath)) {
        New-Item -Path $destinationPath -ItemType Directory -Force | Out-Null
        Write-Host "Created projects directory at '$destinationPath'" -ForegroundColor Green
    }
}

$newProjectFolder = Join-Path -Path $destinationPath -ChildPath $newProjectName

# Check if project already exists
if (Test-Path $newProjectFolder) {
    Write-Warning "Project folder '$newProjectFolder' already exists."
    $response = Read-Host "Delete and recreate? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Removing existing project folder..." -ForegroundColor Yellow
        Remove-Item -Path $newProjectFolder -Recurse -Force
    } else {
        Write-Host "Aborting." -ForegroundColor Red
        exit 0
    }
}

# Store the original location
$originalLocation = Get-Location

# Check if the reference folder exists (relative to script location)
$referenceFolderPath = Join-Path -Path $scriptRoot -ChildPath $referenceFolder
if (-Not (Test-Path $referenceFolderPath)) {
    Write-Error "The reference folder '$referenceFolderPath' does not exist."
    exit 1
}

# Check if the destination path exists
if (-Not (Test-Path $destinationPath)) {
    Write-Error "The destination path '$destinationPath' does not exist."
    exit 1
}

# Create the new project folder if it doesn't exist
try {
    New-Item -Path $newProjectFolder -ItemType Directory -Force | Out-Null
} catch {
    Write-Error "Failed to create the new project folder at '$newProjectFolder'."
    exit 1
}

# Copy the reference folder contents to the new project folder, excluding bin, obj, and node_modules
function Copy-Filtered {
    param (
        [string]$sourcePath,
        [string]$destinationPath
    )
    # Remove the root from the source path to start copying from the folder contents
    Get-ChildItem -Path $sourcePath -Recurse -Force | Where-Object {
        $_.FullName -notmatch '\\bin($|\\)' -and
        $_.FullName -notmatch '\\obj($|\\)' -and
        $_.FullName -notmatch '\\node_modules($|\\)'
    } | ForEach-Object {
        # Calculate the relative path from the reference folder to ensure correct path construction
        $relativePath = $_.FullName.Substring($sourcePath.Length).TrimStart('\')
        $dest = Join-Path -Path $destinationPath -ChildPath $relativePath

        # Check for path length and format issues
        if ($dest.Length -ge 260) {
            Write-Warning "Path length exceeds limit: $dest"
            return
        }

        if ($_.PSIsContainer) {
            if (-Not (Test-Path $dest)) {
                try {
                    New-Item -Path $dest -ItemType Directory -Force | Out-Null
                } catch {
                    Write-Warning "Failed to create directory: $dest"
                }
            }
        } else {
            try {
                Copy-Item -Path $_.FullName -Destination $dest -Force
            } catch {
                Write-Warning "Failed to copy file: $_.FullName to $dest"
            }
        }
    }
}

# Start copying from within the reference folder to avoid nesting the entire structure
Copy-Filtered -sourcePath $referenceFolderPath -destinationPath $newProjectFolder

# Function to rename files and directories, excluding bin, obj, and node_modules
function Rename-ItemsRecursively($path, $oldName, $newName) {
    Get-ChildItem -Path $path -Recurse -Force | Where-Object {
        $_.FullName -notmatch '\\bin($|\\)' -and
        $_.FullName -notmatch '\\obj($|\\)' -and
        $_.FullName -notmatch '\\node_modules($|\\)'
    } | ForEach-Object {
        $newNamePath = $_.FullName -replace [Regex]::Escape($oldName), $newName
        if ($_.FullName -ne $newNamePath) {
            try {
                Rename-Item -Path $_.FullName -NewName $newNamePath
            } catch {
                Write-Warning "Failed to rename: $_.FullName to $newNamePath"
            }
        }
    }
}

# Function to replace content within files, excluding bin, obj, and node_modules
function Replace-ContentInFiles($path, $oldName, $newName) {
    Get-ChildItem -Path $path -File -Recurse -Force | Where-Object {
        $_.FullName -notmatch '\\bin($|\\)' -and
        $_.FullName -notmatch '\\obj($|\\)' -and
        $_.FullName -notmatch '\\node_modules($|\\)'
    } | ForEach-Object {
        try {
            (Get-Content -Path $_.FullName) -replace [Regex]::Escape($oldName), $newName | Set-Content -Path $_.FullName
        } catch {
            Write-Warning "Failed to replace content in: $_.FullName"
        }
    }
}

# Rename files and directories
Rename-ItemsRecursively -path $newProjectFolder -oldName $referenceFolder -newName $newProjectName

# Replace content in files
Replace-ContentInFiles -path $newProjectFolder -oldName $referenceFolder -newName $newProjectName

Write-Host ""
Write-Host "[OK] Project '$newProjectName' created successfully at '$newProjectFolder'" -ForegroundColor Green

# Navigate to the frontend folder and run npm install
$frontendFolderPath = Join-Path -Path $newProjectFolder -ChildPath "$newProjectName.Frontend"

if (Test-Path $frontendFolderPath) {
    try {
        Write-Host ""
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        Set-Location -Path $frontendFolderPath
        npm install
        Write-Host "[OK] npm install completed successfully" -ForegroundColor Green
    } catch {
        Write-Error "Failed to run npm install in '$frontendFolderPath'."
    } finally {
        # Return to the original location
        Set-Location -Path $originalLocation
    }
} else {
    Write-Warning "Frontend folder '$frontendFolderPath' does not exist."
    # Return to the original location if the frontend folder doesn't exist
    Set-Location -Path $originalLocation
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  cd $newProjectFolder"
Write-Host "  cd $newProjectName.Frontend"
Write-Host "  npm run init-umbraco"
Write-Host ""
