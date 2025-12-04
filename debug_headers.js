
async function testHeader(value, name) {
    try {
        await fetch('https://api.github.com', {
            headers: {
                'Authorization': value
            }
        });
        console.log(`[PASS] ${name}`);
    } catch (e) {
        console.log(`[FAIL] ${name}: ${e.message}`);
    }
}

async function run() {
    await testHeader('token valid_token', 'Valid Token');
    await testHeader('token  double_space', 'Double Space');
    await testHeader('token\nnewline', 'Newline');
    await testHeader('token\rreturn', 'Carriage Return');
    await testHeader('token\t', 'Tab');
    await testHeader('token ', 'Trailing Space');
}

run();
