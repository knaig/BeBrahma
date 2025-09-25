# Executor Plan

1. Navigate to ${BEBRAHMA_URL}
2. If signed-out: sign in with ${BEBRAHMA_TEST_EMAIL}/${BEBRAHMA_TEST_PASSWORD}
3. Create a new project using the active persona's task.
4. Progress until you have: solution options + GTM prompt + any exportable artifacts.
5. Capture evidence:
   * Screenshot per major step
   * Start/stop Playwright trace
   * Save HAR
6. Emit a JSON transcript of steps + file paths to /reports/<runId>/artifacts.json
