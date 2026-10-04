// Unique credentials per run so flows never collide with existing accounts.
output.username = "cat" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
output.password = "whiskers-" + Math.floor(Math.random() * 100000);
