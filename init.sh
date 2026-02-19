#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function usage {
 echo -e "\n Usage:\n"
 echo -e "     Interactive mode (default):"
 echo -e "       ./init.sh\n"
 echo -e "     With parameters:"
 echo -e "       ./init.sh -newProjectName [PROJECT_NAME] -destinationPath [DESTINATION_DIRECTORY]\n"
 echo -e "     Ex.: ./init.sh -newProjectName my.test.project -destinationPath '/home/user/code'\n"
}

function check_folder {
  if [ ! -d "$1" ]; then
    echo -e "\nError: $2"
    usage
    exit 1
  fi
}

# Define paths
referenceFolder="Package.Reference.Project"

# Parse command line arguments
while [ $# -gt 0 ]; do
  case "$1" in
    -newProjectName)
      newProjectName="$2"
      shift
      shift
      ;;
    -destinationPath)
      destinationPath="$2"
      shift
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

# Interactive mode if no project name provided
if [ -z "$newProjectName" ]; then
    echo ""
    echo "=== Umbraco.Community Package Bootstrapper ==="
    echo ""
    read -p "Enter project name: " newProjectName
    
    if [ -z "$newProjectName" ]; then
        echo "Error: Project name is required."
        exit 1
    fi
    
    # Default destination is ./projects relative to script location
    destinationPath="$SCRIPT_DIR/projects"
    
    # Create projects folder if it doesn't exist
    if [ ! -d "$destinationPath" ]; then
        mkdir -p "$destinationPath"
        echo "Created projects directory at '$destinationPath'"
    fi
fi

# Validate we have destination path (either from args or interactive)
if [ -z "$destinationPath" ]; then
    echo "Error: The argument destinationPath is required when using -newProjectName"
    usage
    exit 1
fi

newProjectFolder="$destinationPath/$newProjectName"

# Check if project already exists
if [ -d "$newProjectFolder" ]; then
    echo ""
    echo "Warning: Project folder '$newProjectFolder' already exists."
    read -p "Delete and recreate? (y/N): " response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo "Removing existing project folder..."
        rm -rf "$newProjectFolder"
    else
        echo "Aborting."
        exit 0
    fi
fi

# Check folders exist
referenceFolderPath="$SCRIPT_DIR/$referenceFolder"
check_folder "$referenceFolderPath" "The reference folder $referenceFolderPath does not exist."

# Create destination if it doesn't exist
if [ ! -d "$destinationPath" ]; then
    mkdir -p "$destinationPath"
fi

# Copy the reference folder contents to the new project folder, excluding bin, obj, and node_modules
if command -v rsync &> /dev/null; then
    rsync -av --exclude=node_modules --exclude=bin --exclude=obj "$referenceFolderPath/" "$newProjectFolder"
else
    cp -r "$referenceFolderPath/." "$newProjectFolder"
    # Remove excluded folders if they got copied
    find "$newProjectFolder" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null
    find "$newProjectFolder" -type d -name "bin" -exec rm -rf {} + 2>/dev/null
    find "$newProjectFolder" -type d -name "obj" -exec rm -rf {} + 2>/dev/null
fi

# Rename files and directories, excluding bin, obj, and node_modules
find "$newProjectFolder" -depth -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/node_modules/*" -name "*${referenceFolder}*" | while read file; do
    f=$(basename "$file")
    d=$(dirname "$file")
    ff="$d/${f//$referenceFolder/$newProjectName}"
    if [ "$file" != "$ff" ]; then
        mv "$file" "$ff"
    fi
done

# Replace content within files, excluding bin, obj, and node_modules
find "$newProjectFolder" -type f -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/node_modules/*" | while read file; do
    sed "s/$referenceFolder/$newProjectName/g" "$file" > "$file.tmp" 2>/dev/null && mv "$file.tmp" "$file"
done

echo ""
echo "✓ Project '$newProjectName' created successfully at '$newProjectFolder'"

# Navigate to the frontend folder and run npm install
frontendFolderPath="$newProjectFolder/${newProjectName}.Frontend"

if [ -d "$frontendFolderPath" ]; then
    echo ""
    echo "Installing npm dependencies..."
    cd "$frontendFolderPath"
    npm install
    if [ $? -eq 0 ]; then
        echo "✓ npm install completed successfully"
    else
        echo "Error: Failed to run npm install in '$frontendFolderPath'."
    fi
    cd - > /dev/null
else
    echo "Warning: Frontend folder '$frontendFolderPath' does not exist."
fi

echo ""
echo "Next steps:"
echo "  cd $newProjectFolder"
echo "  cd ${newProjectName}.Frontend"
echo "  npm run init-umbraco"
echo ""


