// Test schema endpoints in browser console
// Copy and paste this into your browser's developer console

async function testSchemaEndpoints() {
    console.log("🧪 Testing Schema Endpoints...");
    
    // Get the admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        console.log("❌ No admin token found. Please login first.");
        return;
    }
    
    console.log("✅ Admin token found:", token.substring(0, 20) + "...");
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    try {
        // Test get schemas
        console.log("\n1. Testing GET /api/schemas...");
        const schemasResponse = await fetch('/api/schemas', { headers });
        console.log("Response status:", schemasResponse.status);
        
        if (schemasResponse.ok) {
            const schemas = await schemasResponse.json();
            console.log("✅ Schemas found:", schemas.length);
            schemas.forEach(schema => {
                console.log(`   - ${schema.schema_id}: ${schema.title}`);
            });
        } else {
            const errorText = await schemasResponse.text();
            console.log("❌ Error:", errorText);
        }
        
        // Test validation stats
        console.log("\n2. Testing GET /api/schemas/validation-stats...");
        const statsResponse = await fetch('/api/schemas/validation-stats', { headers });
        console.log("Response status:", statsResponse.status);
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log("✅ Validation stats:", stats);
        } else {
            const errorText = await statsResponse.text();
            console.log("❌ Error:", errorText);
        }
        
    } catch (error) {
        console.log("❌ Network error:", error);
    }
}

// Run the test
testSchemaEndpoints();
