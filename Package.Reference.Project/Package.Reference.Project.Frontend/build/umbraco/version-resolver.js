/**
 * Resolves the latest Umbraco version from releases.umbraco.com
 * Falls back to a default version if the website cannot be reached
 */

const DEFAULT_UMBRACO_VERSION = "17.2.0";
const RELEASES_URL = "https://releases.umbraco.com/all-releases";

/**
 * Fetches the latest Umbraco version from the releases website
 * @returns {Promise<string>} The latest version number
 */
export async function fetchLatestUmbracoVersion() {
    try {
        const response = await fetch(RELEASES_URL, {
            headers: {
                'User-Agent': 'Umbraco.Community.Bellissima.Bootstrapper'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            console.warn(`Failed to fetch releases page: ${response.status} ${response.statusText}`);
            return DEFAULT_UMBRACO_VERSION;
        }

        const html = await response.text();
        
        // Parse the latest version from the first "latest-release-card"
        // Looking for: <div class="latest-release-card">...<a href="/release/umbraco/Umbraco-CMS/17.2.0">v17.2.0</a>
        const versionMatch = html.match(/<div class="latest-release-card">[\s\S]*?<a[^>]*>v?([\d.]+)<\/a>/i);
        
        if (versionMatch && versionMatch[1]) {
            const version = versionMatch[1];
            console.log(`✓ Resolved latest Umbraco version: ${version}`);
            return version;
        }

        console.warn('Could not parse version from releases page, using default');
        return DEFAULT_UMBRACO_VERSION;
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.warn('Timeout fetching Umbraco releases page');
        } else {
            console.warn(`Error fetching latest version: ${error.message}`);
        }
        return DEFAULT_UMBRACO_VERSION;
    }
}

/**
 * Resolves the Umbraco version to use
 * @param {string|undefined} specifiedVersion - Version specified by user, or undefined to auto-resolve
 * @returns {Promise<string>} The version to use
 */
export async function resolveUmbracoVersion(specifiedVersion) {
    if (specifiedVersion) {
        console.log(`Using specified Umbraco version: ${specifiedVersion}`);
        return specifiedVersion;
    }

    console.log('No version specified, resolving latest from releases.umbraco.com...');
    return await fetchLatestUmbracoVersion();
}

export { DEFAULT_UMBRACO_VERSION };
