export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Replace this with actual authentication logic
    if (username === 'admin' && password === 'password') {
      res.status(200).json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
