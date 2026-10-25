// Agent 37 Provider Adapter for ExitLab Simulation Assistant
// Interacts with Agent 37 Cloud instances using official documentation

/**
 * Validates whether Agent 37 configuration is present in server environment.
 */
export function isAgent37Configured() {
  const apiKey = process.env.AGENT37_API_KEY;
  const instanceId = process.env.AGENT37_INSTANCE_ID;
  return Boolean(apiKey && apiKey.trim() && instanceId && instanceId.trim());
}

/**
 * Formats a compact, objective summary of the ExitLab simulation run.
 */
export function buildRunSummary(run) {
  if (!run || typeof run !== 'object') {
    return 'No simulation run data provided.';
  }

  const lines = [];

  if (run.clearanceSeconds !== undefined) {
    lines.push(`- Clearance Duration: ${run.clearanceSeconds}s`);
  }
  if (run.maxQueueLength !== undefined) {
    lines.push(`- Peak Doorway Queue: ${run.maxQueueLength} occupants`);
  }
  if (run.avgWaitSeconds !== undefined) {
    lines.push(`- Average Wait Time: ${run.avgWaitSeconds}s`);
  }
  if (run.maxWaitSeconds !== undefined) {
    lines.push(`- Maximum Wait Time: ${run.maxWaitSeconds}s`);
  }
  if (run.unreachableCount !== undefined) {
    lines.push(`- Trapped / Cut-off Occupants: ${run.unreachableCount}`);
  }
  if (run.occupantCount !== undefined) {
    lines.push(`- Total Occupants: ${run.occupantCount}`);
  }
  if (run.blockedExits && run.blockedExits.length > 0) {
    lines.push(`- Blocked Exits: ${run.blockedExits.join(', ')}`);
  } else {
    lines.push(`- Blocked Exits: None (all exits open)`);
  }
  if (run.extraObstaclesCount !== undefined && run.extraObstaclesCount > 0) {
    lines.push(`- Extra Debris/Obstacles Placed: ${run.extraObstaclesCount}`);
  }
  if (run.exitUsage && typeof run.exitUsage === 'object') {
    const usageParts = Object.entries(run.exitUsage)
      .map(([id, count]) => `Exit ${id}: ${count} evacuated`)
      .join(', ');
    lines.push(`- Exit Throughput Breakdown: ${usageParts || 'None'}`);
  }
  if (run.baselineClearanceSeconds !== undefined && run.baselineClearanceSeconds !== null) {
    lines.push(`- Baseline Clearance Duration: ${run.baselineClearanceSeconds}s`);
    if (run.clearanceDeltaSeconds !== undefined && run.clearanceDeltaSeconds !== null) {
      const deltaSign = run.clearanceDeltaSeconds >= 0 ? '+' : '';
      const pctStr = run.clearanceDeltaPct !== undefined && run.clearanceDeltaPct !== null
        ? ` (${deltaSign}${Number(run.clearanceDeltaPct).toFixed(1)}%)`
        : '';
      lines.push(`- Delta vs Baseline: ${deltaSign}${run.clearanceDeltaSeconds}s${pctStr}`);
    }
  }
  if (run.explanations && Array.isArray(run.explanations) && run.explanations.length > 0) {
    lines.push(`- Rule-Based Bottleneck Findings:\n  * ${run.explanations.join('\n  * ')}`);
  }

  return lines.join('\n');
}

/**
 * Sends a simulation question to the Agent 37 instance using official endpoints.
 *
 * @param {string} question - The user's question about the run.
 * @param {object|string} runData - Compact run metrics object or preformatted summary.
 * @returns {Promise<{ success: boolean, answer?: string, error?: string, configured: boolean }>}
 */
export async function askAgent37(question, runData) {
  const apiKey = process.env.AGENT37_API_KEY;
  const instanceId = process.env.AGENT37_INSTANCE_ID;

  if (!apiKey || !apiKey.trim() || !instanceId || !instanceId.trim()) {
    return {
      success: false,
      configured: false,
      error: 'Agent 37 is not configured. Set AGENT37_API_KEY and AGENT37_INSTANCE_ID in the backend environment.',
    };
  }

  const runSummary = typeof runData === 'string' ? runData : buildRunSummary(runData);

  const systemInstructions = `You are ExitLab's Simulation Assistant. ExitLab is a deterministic 2D cellular evacuation simulator.
Your job is to answer user questions about the current evacuation simulation run strictly based on the computed metrics and rule-based explanations provided below.

RULES:
1. Ground all explanations exclusively in the provided metrics, exit usage, queue lengths, and bottleneck findings.
2. Do NOT invent unrecorded metrics, physical phenomena (e.g. fire, toxic fumes), or speculative events.
3. Keep responses concise, objective, and analytical (2-4 brief paragraphs).
4. Do NOT claim that ExitLab or your answers provide legal life-safety, fire code, or certified building engineering compliance.
5. All outputs are comparative educational estimates.`;

  const fullPrompt = `${systemInstructions}

=== CURRENT SIMULATION RUN METRICS ===
${runSummary}

=== USER QUESTION ===
${question}

Provide a helpful, grounded explanation:`;

  // Official Agent 37 endpoint for conversation turns:
  // POST https://{instanceId}.agent37.app/v1/responses
  const endpoint = `https://${instanceId.trim()}.agent37.app/v1/responses`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent37-Key': apiKey.trim(),
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      let errorDetail = '';
      try {
        const errJson = await response.json();
        errorDetail = errJson.error || errJson.message || '';
      } catch {
        errorDetail = await response.text().catch(() => '');
      }

      if (status === 401 || status === 403) {
        return {
          success: false,
          configured: true,
          error: 'Agent 37 authentication failed. Please verify AGENT37_API_KEY.',
        };
      }
      if (status === 404) {
        return {
          success: false,
          configured: true,
          error: `Agent 37 instance "${instanceId}" was not found. Please check AGENT37_INSTANCE_ID.`,
        };
      }

      return {
        success: false,
        configured: true,
        error: `Agent 37 upstream error (${status})${errorDetail ? `: ${errorDetail}` : ''}`,
      };
    }

    const data = await response.json();

    // Parse answer from Agent 37 response structure
    let answerText = '';
    if (typeof data.output_text === 'string') {
      answerText = data.output_text;
    } else if (Array.isArray(data.output_text)) {
      answerText = data.output_text
        .map((chunk) => (typeof chunk === 'string' ? chunk : chunk?.text || ''))
        .join('');
    } else if (data.choices && data.choices[0]?.message?.content) {
      answerText = data.choices[0].message.content;
    } else if (typeof data.text === 'string') {
      answerText = data.text;
    } else if (typeof data.answer === 'string') {
      answerText = data.answer;
    } else if (data.answer && typeof data.answer.output_text === 'string') {
      answerText = data.answer.output_text;
    } else {
      answerText = JSON.stringify(data);
    }

    return {
      success: true,
      configured: true,
      answer: answerText.trim(),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        configured: true,
        error: 'Agent 37 request timed out after 15 seconds.',
      };
    }
    return {
      success: false,
      configured: true,
      error: `Failed to connect to Agent 37: ${err.message || 'Network error'}`,
    };
  }
}
