export async function uploadViaApi(file: File, path: string, bucket: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('path', path)
  form.append('bucket', bucket)

  const res = await fetch('/api/storage-upload', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) {
        message = data.error
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }
}

