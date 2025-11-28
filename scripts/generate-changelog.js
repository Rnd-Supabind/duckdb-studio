import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const CHANGELOG_FILE = 'CHANGELOG.md';

function getGitLog() {
    try {
        // Get commits since the last tag, or all if no tags
        let range = '';
        try {
            const lastTag = execSync('git describe --tags --abbrev=0', { stdio: 'pipe' }).toString().trim();
            range = `${lastTag}..HEAD`;
        } catch (e) {
            range = 'HEAD';
        }

        const log = execSync(`git log ${range} --pretty=format:"- %s (%h) - %an"`, { stdio: 'pipe' }).toString();
        return log;
    } catch (e) {
        console.error('Failed to get git log:', e.message);
        return '';
    }
}

function generateChangelog() {
    const date = new Date().toISOString().split('T')[0];
    const log = getGitLog();

    if (!log) {
        console.log('No new commits found.');
        return;
    }

    const newEntry = `\n## [Unreleased] - ${date}\n\n${log}\n`;

    let content = '';
    if (existsSync(CHANGELOG_FILE)) {
        content = readFileSync(CHANGELOG_FILE, 'utf-8');
    } else {
        content = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n';
    }

    // Prepend new entry after header
    const lines = content.split('\n');
    const headerIndex = lines.findIndex(line => line.startsWith('# Changelog'));

    if (headerIndex !== -1) {
        lines.splice(headerIndex + 2, 0, newEntry);
        writeFileSync(CHANGELOG_FILE, lines.join('\n'));
    } else {
        writeFileSync(CHANGELOG_FILE, content + newEntry);
    }

    console.log(`Changelog updated in ${CHANGELOG_FILE}`);
}

generateChangelog();
