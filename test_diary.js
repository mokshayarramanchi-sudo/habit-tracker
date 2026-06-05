const http = require('http');

async function test() {
    const signup = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Test', email: `test${Date.now()}@test.com`, password: 'password123' })
    });
    const signupData = await signup.json();
    const token = signupData.token;

    console.log('Signup:', signup.status, signupData.message);

    const create = await fetch('http://localhost:3000/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: 'Test', content: 'Test Content', moodIcon: '😄' })
    });
    const createData = await create.json();
    console.log('Create:', create.status, createData._id);

    const update = await fetch(`http://localhost:3000/api/diary/${createData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: 'Test 2', content: 'Test Content 2', moodIcon: '🙂' })
    });
    const updateData = await update.json();
    console.log('Update:', update.status, updateData.message || updateData.title);

    const del = await fetch(`http://localhost:3000/api/diary/${createData._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const delData = await del.json();
    console.log('Delete:', del.status, delData.message);
}
test().catch(console.error);
