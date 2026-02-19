import init from "./umbraco/init.js";
import test from "./umbraco/test.js";
import remove from "./umbraco/remove.js";
import syncUsync from "./umbraco/usync.js";
import publish from "./umbraco/publish.js";

// Define async function for "init-umbraco"
async function initUmbraco(args) {
  await init(args);
}

// Define async function for "test-umbraco"
async function testUmbraco(args) {
    await test(args)
}

// Define async function for "remove-umbraco"
async function removeUmbraco(args) {
  await remove(args);
}

function usync(args) {
  syncUsync(args)
}

function publishPackage(args) {
  publish(args);
}

// Get the action and additional parameters from command-line arguments
const [,, action, ...args] = process.argv; // Capture action and all additional arguments

// Decide which function to execute based on the action (using async IIFE)
(async () => {
  switch (action) {
    case 'init-umbraco':
      await initUmbraco(args);
      break;
    case 'test-umbraco':
      await testUmbraco(args);
      break;
    case 'remove-umbraco':
      await removeUmbraco(args);
      break;
    case 'usync':
      usync(args);
      break;
    case 'publish':
      publishPackage(args);
      break;
    default:
      console.log('Unknown action. Please specify one of the following: init-umbraco, test-umbraco, remove-umbraco, usync, publish');
  }
})();
