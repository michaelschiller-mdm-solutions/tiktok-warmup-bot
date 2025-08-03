// Script to add host accounts to queue for depth 1 testing
const fs = require('fs');

// Read host accounts
const hostContent = fs.readFileSync('marktde/host_accounts.csv', 'utf8');
const hostLines = hostContent.split('\n').slice(1).filter(line => line.trim());

// Create queue file with header
const queueHeader = 'name,ID,link,depth,added_timestamp\n';
let queueContent = queueHeader;

// Add first 5 host accounts to queue for depth 1
const accountsToAdd = hostLines.slice(0, 5);
accountsToAdd.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 3) {
        const name = parts[0];
        const id = parts[1];
        const link = parts[2];
        queueContent += `${name},${id},"${link}",1,${new Date().toISOString()}\n`;
    }
});

fs.writeFileSync('marktde/queue_accounts.csv', queueContent);
console.log(`Added ${accountsToAdd.length} host accounts to queue for depth 1`);