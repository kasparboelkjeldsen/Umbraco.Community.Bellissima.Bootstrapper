/**
 * Post-configuration for Umbraco projects
 * - Removes RazorCompileOnBuild/RazorCompileOnPublish settings
 * - Copies appsettings-schema.* files from Backend
 * - Configures ModelsBuilder to SourceCodeAuto
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

/**
 * Removes the RazorCompileOnBuild PropertyGroup from the csproj file
 * @param {string} csprojPath - Path to the .csproj file
 */
export function removeRazorCompileSettings(csprojPath) {
    if (!existsSync(csprojPath)) {
        console.warn(`Csproj file not found: ${csprojPath}`);
        return;
    }

    let content = readFileSync(csprojPath, 'utf-8');
    
    // Remove the PropertyGroup containing RazorCompileOnBuild and RazorCompileOnPublish
    // This regex matches the entire PropertyGroup block with the comment and both settings
    const razorPropertyGroupRegex = /\s*<PropertyGroup>\s*<!--\s*Remove RazorCompileOnBuild.*?-->\s*<RazorCompileOnBuild>false<\/RazorCompileOnBuild>\s*<RazorCompileOnPublish>false<\/RazorCompileOnPublish>\s*<\/PropertyGroup>/gs;
    
    const newContent = content.replace(razorPropertyGroupRegex, '');
    
    if (newContent !== content) {
        writeFileSync(csprojPath, newContent, 'utf-8');
        console.log('✓ Removed RazorCompileOnBuild/RazorCompileOnPublish settings from csproj');
    } else {
        console.log('  RazorCompile settings not found or already removed');
    }
}

/**
 * Copies appsettings-schema.* files from Backend to the Umbraco project
 * @param {string} backendDir - Path to the Backend project directory
 * @param {string} umbracoProjectDir - Path to the Umbraco project directory
 */
export function copyAppSettingsSchemas(backendDir, umbracoProjectDir) {
    if (!existsSync(backendDir)) {
        console.warn(`Backend directory not found: ${backendDir}`);
        return;
    }

    const schemaFiles = readdirSync(backendDir).filter(f => f.startsWith('appsettings-schema.'));
    
    if (schemaFiles.length === 0) {
        console.log('  No appsettings-schema.* files found in Backend');
        return;
    }

    for (const file of schemaFiles) {
        const srcPath = join(backendDir, file);
        const destPath = join(umbracoProjectDir, file);
        copyFileSync(srcPath, destPath);
        console.log(`✓ Copied ${file}`);
    }
}

/**
 * Configures ModelsBuilder to use SourceCodeAuto mode
 * @param {string} umbracoProjectDir - Path to the Umbraco project directory
 */
export function configureModelsBuilder(umbracoProjectDir) {
    const appsettingsPath = join(umbracoProjectDir, 'appsettings.json');
    
    if (!existsSync(appsettingsPath)) {
        console.warn(`appsettings.json not found: ${appsettingsPath}`);
        return;
    }

    let config;
    try {
        const content = readFileSync(appsettingsPath, 'utf-8');
        config = JSON.parse(content);
    } catch (error) {
        console.error(`Failed to parse appsettings.json: ${error.message}`);
        return;
    }

    // Ensure the Umbraco.CMS.ModelsBuilder path exists
    if (!config.Umbraco) {
        config.Umbraco = {};
    }
    if (!config.Umbraco.CMS) {
        config.Umbraco.CMS = {};
    }
    if (!config.Umbraco.CMS.ModelsBuilder) {
        config.Umbraco.CMS.ModelsBuilder = {};
    }

    // Set ModelsMode to SourceCodeAuto
    config.Umbraco.CMS.ModelsBuilder.ModelsMode = 'SourceCodeAuto';

    // Write back the modified config
    writeFileSync(appsettingsPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✓ Configured ModelsBuilder ModelsMode to SourceCodeAuto');
}

/**
 * Runs all post-configuration steps for an Umbraco project
 * @param {string} umbracoProjectDir - Path to the Umbraco project directory
 * @param {string} projectName - Name of the Umbraco project
 * @param {string} backendDir - Path to the Backend project directory
 */
export function runPostConfiguration(umbracoProjectDir, projectName, backendDir) {
    console.log('\nRunning post-configuration...');
    
    const csprojPath = join(umbracoProjectDir, `${projectName}.csproj`);
    
    // 1. Remove RazorCompile settings
    removeRazorCompileSettings(csprojPath);
    
    // 2. Copy appsettings-schema files
    copyAppSettingsSchemas(backendDir, umbracoProjectDir);
    
    // 3. Configure ModelsBuilder
    configureModelsBuilder(umbracoProjectDir);
    
    console.log('Post-configuration complete.\n');
}
