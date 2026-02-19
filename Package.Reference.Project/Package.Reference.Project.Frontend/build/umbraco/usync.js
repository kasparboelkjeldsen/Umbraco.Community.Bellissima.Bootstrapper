import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { existsSync, readdirSync, statSync, rmSync, cpSync } from 'fs';
import { fileURLToPath } from 'url';

export default function syncUsync() {
    // Get the current directory in ES module context
    const __filename = fileURLToPath(import.meta.url);
    const frontendDir = dirname(__filename);
    const rootDir = resolve(frontendDir, '../../../'); // Move up three levels to the correct root directory
    const umbracoRootDir = join(rootDir, 'Umbraco');

    // Initialize an array to hold results
    const umbracoResults = [];

    // Get all subfolders in the /Umbraco/ directory that start with "Umbraco-"
    const umbracoFolders = readdirSync(umbracoRootDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase().startsWith('umbraco-'))
        .map(dirent => join(umbracoRootDir, dirent.name));

    // Loop through each Umbraco folder to find the uSync folder
    umbracoFolders.forEach(folder => {
        // Look for usync versioned folders (v14, v15, v16, v17, etc.)
        const usyncBaseDir = join(folder, 'usync');
        if (!existsSync(usyncBaseDir)) return;

        // Find versioned subdirectories (v14, v15, v16, v17, etc.)
        const versionedDirs = readdirSync(usyncBaseDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && /^v\d+$/.test(dirent.name))
            .map(dirent => dirent.name);

        // Use the highest version found
        const latestVersion = versionedDirs.sort((a, b) => {
            const numA = parseInt(a.substring(1));
            const numB = parseInt(b.substring(1));
            return numB - numA;
        })[0];

        if (!latestVersion) return;

        const usyncPath = join(usyncBaseDir, latestVersion);

        if (existsSync(usyncPath)) {
            // Get the newest file in the usync version folder and its subfolders
            const files = readdirSync(usyncPath, { withFileTypes: true });
            const newestFile = files
                .filter(file => !file.isDirectory())
                .map(file => ({
                    file,
                    mtime: statSync(join(usyncPath, file.name)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime)[0];

            // If a file is found, add its details to the results array
            if (newestFile) {
                umbracoResults.push({
                    umbracoFolder: folder,
                    usyncPath: usyncPath,
                    lastModified: newestFile.mtime
                });
            }
        }
    });

    // Find the Umbraco folder with the most recently updated uSync folder
    const mostRecent = umbracoResults.sort((a, b) => b.lastModified - a.lastModified)[0];

    // Copy the uSync folder from the most recent Umbraco folder
    if (mostRecent) {
        const destinationPath = join(rootDir, 'usync');

        // Check if the uSync folder already exists in the executing directory
        if (existsSync(destinationPath)) {
            // Delete the existing uSync folder
            rmSync(destinationPath, { recursive: true, force: true });
            console.log(`Deleted existing usync folder in the executing directory`);
        }

        // Copy the fresh uSync folder to the executing directory
        cpSync(join(mostRecent.usyncPath, '..'), destinationPath, { recursive: true, force: true });
        console.log(`Copied the usync folder from ${mostRecent.umbracoFolder} to ${destinationPath}`);

        // Delete all uSync folders in the top-level Umbraco directories
        umbracoFolders.forEach(folder => {
            const usyncPathToDelete = join(folder, 'usync');
            if (existsSync(usyncPathToDelete)) {
                rmSync(usyncPathToDelete, { recursive: true, force: true });
                console.log(`Deleted usync folder in ${folder}`);
            }
        });

        // Copy the saved uSync folder to all top-level Umbraco directories
        umbracoFolders.forEach(folder => {
            const destinationUsyncPath = join(folder, 'usync');
            cpSync(destinationPath, destinationUsyncPath, { recursive: true, force: true });
            console.log(`Copied usync folder to ${folder}`);
        });
    } else {
        console.log(`No usync versioned folders (v14, v15, v16, v17, etc.) were found in any Umbraco folders.`);
    }
}
