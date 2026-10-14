// Allow only diagnostic metadata: employee data can appear in arbitrary context.
const pick = (source, keys) => Object.fromEntries(keys
  .filter((key) => source?.[key] !== undefined)
  .map((key) => [key, source[key]]));

export function sanitizeErrorEvent(event) {
  const clean = pick(event, ['event_id', 'timestamp', 'platform', 'level', 'release', 'dist', 'environment']);
  if (event.exception?.values) {
    clean.exception = { values: event.exception.values.map((exception) => {
      const result = pick(exception, ['type']);
      result.value = 'Error details withheld for employee privacy';
      if (exception.mechanism) result.mechanism = pick(exception.mechanism, ['type', 'handled', 'synthetic']);
      if (exception.stacktrace?.frames) {
        result.stacktrace = { frames: exception.stacktrace.frames.map((frame) => {
          const safe = pick(frame, ['function', 'module', 'lineno', 'colno', 'in_app', 'instruction_addr', 'symbol_addr', 'image_addr', 'package']);
          for (const field of ['filename', 'abs_path']) {
            if (typeof frame[field] === 'string') safe[field] = frame[field].split(/[?#]/)[0];
          }
          return safe;
        }) };
      }
      return result;
    }) };
  }
  if (event.contexts) {
    clean.contexts = {};
    const fields = {
      os: ['name', 'version', 'build', 'rooted'],
      device: ['model', 'manufacturer', 'brand', 'family', 'arch', 'simulator', 'orientation', 'screen_width_pixels', 'screen_height_pixels'],
      app: ['app_identifier', 'app_version', 'app_build', 'in_foreground'],
      runtime: ['name', 'version'],
    };
    for (const [name, keys] of Object.entries(fields)) {
      if (event.contexts[name]) clean.contexts[name] = pick(event.contexts[name], keys);
    }
  }
  // Debug image identifiers are needed for native crash symbolication.
  if (event.debug_meta?.images) clean.debug_meta = { images: event.debug_meta.images.map((image) => {
    const safe = pick(image, ['type', 'debug_id', 'code_id', 'image_addr', 'image_size', 'arch', 'uuid']);
    if (typeof image.code_file === 'string') safe.code_file = image.code_file.split(/[?#]/)[0];
    return safe;
  }) };
  return clean;
}
