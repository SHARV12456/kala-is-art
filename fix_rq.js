const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We want to replace .invalidateQueries([ ... ])
      // with .invalidateQueries({ queryKey: [ ... ] })
      
      // regex to match: invalidateQueries(['something', var])
      // Using a regex carefully since there can be nested brackets.
      // Wait, simple string replacement using regex for invalidateQueries\((\[.*?\])\)
      const regex = /invalidateQueries\((\[.*?\])\)/g;
      const newContent = content.replace(regex, "invalidateQueries({ queryKey: $1 })");
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log("Updated", fullPath);
      }
    }
  }
}

processDir('./frontend/src');
console.log("Done");
