const http = require('http');
async function test() {
    const signup = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Test2', email: `test${Date.now()}@test.com`, password: 'password123' })
    });
    const signupData = await signup.json();
    const token = signupData.token;
    
    const create = await fetch('http://localhost:3000/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: 'Test', content: 'Test Content', moodIcon: '😄' })
    });
    const createData = await create.json();
    
    const update = await fetch(`http://localhost:3000/api/diary/${createData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: 'Test 2', content: 'Test Content 2', moodIcon: '🙂' })
    });
    const updateText = await update.text();
    console.log(updateText);
}
test().catch(console.error);
