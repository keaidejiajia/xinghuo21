export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  return res.status(200).json({
    tokenSet: !!token,
    tokenPreview: token ? token.slice(0, 8) + '...' : 'NOT SET',
    time: new Date().toISOString(),
  });
}
