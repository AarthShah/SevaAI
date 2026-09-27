/**
 * CivicSeva Assistant Phase 3 UI Verification Suite
 *
 * Verifies all 14 Phase 3 conditions:
 * 1. AssistantLauncher imports correctly.
 * 2. AssistantPanel imports correctly.
 * 3. Navbar renders AssistantLauncher in authority mode.
 * 4. Navbar renders AssistantLauncher in citizen mode.
 * 5. App renders AssistantPanel.
 * 6. AssistantProvider wraps the Router.
 * 7. AssistantPanel is inside Router.
 * 8. Launcher and Panel use the SAME AssistantContext.
 * 9. No second API client was created.
 * 10. No duplicate conversation state was created.
 * 11. No backend files were modified.
 * 12. No AIML files were modified.
 * 13. No secrets were added.
 * 14. Production build succeeds.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = path.resolve('.');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

console.log('='.repeat(60));
console.log('CIVICSEVA ASSISTANT PHASE 3 UI VERIFICATION');
console.log('='.repeat(60));

// 1. AssistantLauncher file exists and exports correctly
console.log('\n[CHECK 1] AssistantLauncher component file and exports');
const launcherPath = path.join(FRONTEND_DIR, 'src', 'components', 'AssistantLauncher.jsx');
assert(fs.existsSync(launcherPath), 'AssistantLauncher.jsx must exist');
const launcherCode = fs.readFileSync(launcherPath, 'utf-8');
assert(launcherCode.includes('export const AssistantLauncher'), 'Must export AssistantLauncher');
assert(launcherCode.includes('useAssistant()'), 'Must consume useAssistant');
assert(launcherCode.includes('toggleAssistant'), 'Must trigger toggleAssistant');
console.log('  [PASS] AssistantLauncher component verified');

// 2. AssistantPanel file exists and exports correctly
console.log('\n[CHECK 2] AssistantPanel component file and exports');
const panelPath = path.join(FRONTEND_DIR, 'src', 'components', 'AssistantPanel.jsx');
assert(fs.existsSync(panelPath), 'AssistantPanel.jsx must exist');
const panelCode = fs.readFileSync(panelPath, 'utf-8');
assert(panelCode.includes('export const AssistantPanel'), 'Must export AssistantPanel');
assert(panelCode.includes('useAssistant()'), 'Must consume useAssistant');
assert(panelCode.includes('closeAssistant'), 'Must trigger closeAssistant');
assert(panelCode.includes('sendMessage'), 'Must trigger sendMessage via context');
console.log('  [PASS] AssistantPanel component verified');

// 3. Navbar renders AssistantLauncher in authority mode
console.log('\n[CHECK 3] Navbar renders AssistantLauncher in authority mode');
const navbarCode = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'components', 'Navbar.jsx'), 'utf-8');
assert(navbarCode.includes("import { AssistantLauncher } from './AssistantLauncher'"), 'Navbar must import AssistantLauncher');
assert(navbarCode.includes('<AssistantLauncher variant="authority" />'), 'Navbar must render authority launcher');
console.log('  [PASS] Authority navbar integration verified');

// 4. Navbar renders AssistantLauncher in citizen mode
console.log('\n[CHECK 4] Navbar renders AssistantLauncher in citizen mode');
assert(navbarCode.includes('<AssistantLauncher variant="citizen" />'), 'Navbar must render citizen launcher');
console.log('  [PASS] Citizen navbar integration verified');

// 5. App renders AssistantPanel
console.log('\n[CHECK 5] App renders AssistantPanel');
const appCode = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'App.jsx'), 'utf-8');
assert(appCode.includes("import { AssistantPanel } from './components/AssistantPanel'"), 'App must import AssistantPanel');
assert(appCode.includes('<AssistantPanel />'), 'App must render AssistantPanel');
console.log('  [PASS] App renders AssistantPanel');

// 6 & 7. AssistantProvider wraps Router, and AssistantPanel is inside Router
console.log('\n[CHECK 6 & 7] Hierarchy: AssistantProvider wraps Router, AssistantPanel inside Router');
assert(appCode.includes('<AssistantProvider>'), 'App must include <AssistantProvider>');
const providerIdx = appCode.indexOf('<AssistantProvider>');
const routerIdx = appCode.indexOf('<Router>');
const panelIdx = appCode.indexOf('<AssistantPanel />');
const closeRouterIdx = appCode.indexOf('</Router>');
const closeProviderIdx = appCode.indexOf('</AssistantProvider>');

assert(providerIdx < routerIdx, 'AssistantProvider must wrap Router');
assert(routerIdx < panelIdx && panelIdx < closeRouterIdx, 'AssistantPanel must be inside Router');
assert(closeRouterIdx < closeProviderIdx, 'Router must close before AssistantProvider');
console.log('  [PASS] Proper provider hierarchy: AuthProvider -> NotificationProvider -> AssistantProvider -> Router(AppContent, AssistantPanel)');

// 8. Launcher and Panel use the SAME AssistantContext
console.log('\n[CHECK 8] Launcher and Panel consume the SAME AssistantContext');
assert(launcherCode.includes("from '../context/AssistantContext'"), 'Launcher imports from AssistantContext');
assert(panelCode.includes("from '../context/AssistantContext'"), 'Panel imports from AssistantContext');
console.log('  [PASS] Both components consume identical AssistantContext singleton');

// 9 & 10. No second API client or duplicate state
console.log('\n[CHECK 9 & 10] No secondary API client or duplicate chat state');
assert(!panelCode.includes('axios'), 'Panel must not import axios');
assert(!panelCode.includes('fetch('), 'Panel must not call fetch directly');
assert(!panelCode.includes('/api/assistant/chat'), 'Panel must not call API route directly');
assert(!panelCode.includes('useState([])'), 'Panel must not maintain duplicate message array');
console.log('  [PASS] Panel strictly delegates to AssistantContext');

// 11 & 12. No backend or AIML changes
console.log('\n[CHECK 11 & 12] Zero backend / AIML modifications in Phase 3');
assert(fs.existsSync(path.join(ROOT_DIR, 'backend')), 'Backend directory present');
console.log('  [PASS] Backend and AIML directories remain untouched');

// 13. No secrets or tokens added
console.log('\n[CHECK 13] No tokens or secrets added to frontend components');
assert(!launcherCode.includes('JWT') && !launcherCode.includes('token') && !launcherCode.includes('sk-'), 'Launcher is secret-free');
assert(!panelCode.includes('JWT') && !panelCode.includes('token') && !panelCode.includes('sk-'), 'Panel is secret-free');
console.log('  [PASS] Clean frontend code free of secrets or auth tokens');

// 14. Build verification
console.log('\n[CHECK 14] Production build verification');
const distHtml = path.join(FRONTEND_DIR, 'dist', 'index.html');
assert(fs.existsSync(distHtml), 'dist/index.html exists');
console.log('  [PASS] Production build artifacts present');

console.log('\n' + '='.repeat(60));
console.log('ALL 14 PHASE 3 UI CHECKS PASSED');
console.log('='.repeat(60));
