Affiliate API
Push leads individually or in batches of up to 1,000, and track their status in real time.
🔑
 Authentication
All requests must include your API key. You can pass it in either of two ways:
METHOD
HEADER
EXAMPLE
Bearer Token
Authorization
Bearer your-api-key-here
Custom Header
X-API-Key
your-api-key-here
Keep your API key secret. Do not expose it in frontend code or public repositories.
⚠
🌐
 Base URL
All endpoints use the following base URL (replace with the URL provided to you):
https://perfectoscrmus.com/lead/v1
⚠
 Error Handling
All responses return a JSON object with a status field. Non-200 statuses indicate an error.
STATUS MEANING
200 Success
400 Bad request — invalid or missing data
401 Unauthorized — invalid or missing API key
404 Lead not found or access denied
500 Server error — try again or contact support
Push Single Lead
Create one lead at a time. Best for real-time integrations where leads arrive individually.
POST /lead/v1/public
Request Body
FIELD TYPE DESCRIPTION
email string REQUIRED Lead's email address (used as unique identifier)
firstName string Optional First name
lastName string Optional Last name
phone string Optional Primary phone number
secondPhone string Optional Secondary phone number
country string Optional Country
city string Optional City
FIELD
TYPE
Optional
DESCRIPTION
address
string
Full address
source
string
Optional
Lead source / campaign name
comment
Example Request
{
string
Optional
"email": "john.doe@example.com",
"firstName": "John",
"lastName": "Doe",
"phone": "+1234567890",
"country": "United States",
"source": "facebook-campaign-q1",
"comment": "Interested in premium plan"
}
Initial comment / note
Copy
Success Response
{
"status": 200,
"data": {
"RESULT": "SUCCESS",
"message": "Lead created successfully",
"lead": {
"id": "6651a3f4b8e9c12d4f000001",
"email": "john.doe@example.com",
"firstName": "John",
"lastName": "Doe",
"status": "New",
"affiliate": "YourAffiliateName"
    }
  }
}
Duplicate Email Response
{
}
"status": 400,
"data": {
"RESULT": "ERROR",
"message": "A lead with this email address already exists"
  }
Push Batch (up to 1,000 leads)
Push many leads in a single request. Ideal when you have accumulated leads to send in bulk. Maximum
1,000 leads per request. For larger volumes, split into multiple requests.
POST
💡
/lead/v1/public/batch
Performance: The batch endpoint is heavily optimized — duplicate checking, lead creation, and
assignment all happen in bulk database operations. Pushing 1,000 leads via batch takes seconds,
compared to minutes with individual calls.
Request Body
Send a JSON object with a leads array. Each lead object accepts the same fields as the single push
endpoint.
{
"leads": [
    {
"email": "john@example.com",
"firstName": "John",
"lastName": "Doe",
"phone": "+1234567890",
"country": "US",
Copy
Lead Fields
FIELD TYPE DESCRIPTION
email string REQUIRED Lead's email (unique identifier, used for deduplication)
firstName string Optional First name
lastName string Optional Last name
phone string Optional Primary phone number
secondPhone string Optional Secondary phone number
country string Optional Country
city string Optional City
address string Optional Full address
source string Optional Lead source / campaign name
comment string Optional Initial comment / note attached to the lead
Success Response
      "source": "campaign-a",
      "comment": "VIP lead"
    },
    {
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+0987654321",
      "country": "UK"
    }
    // ... up to 1,000 leads
  ]
}
{
"status": 200,
"data": {
"RESULT": "SUCCESS",
"summary": {
"total": 500,       
"created": 485,     
"duplicates": 12,   
"errors": 3          
    },
"created": [
      {
"id": "6651a3f4b8e9c12d4f000001",
"email": "john@example.com",
"firstName": "John",
"lastName": "Doe",
"status": "New"
      }
// Total leads sent
// Successfully created
// Skipped (email already exists)
// Failed (validation errors)
// ... all created leads
    ],
"duplicates": [
      {
"index": 5,
"email": "existing@email.com",
"reason": "Email already exists"
      }
    ],
"errors": [
      {
"index": 7,
"reason": "Email is required"
      }
    ]
  }
}
✅
Partial success is possible. If some leads are duplicates or have validation errors, the rest will still be
created. Always check the summary object to verify how many leads were processed.
Limits
LIMIT
VALUE
Max leads per batch request
1,000
Max request body size
📦
100 MB
Need to push more than 1,000? Simply split your leads into batches of 1,000 and send multiple
requests. For example, 2,500 leads = 3 requests (1,000 + 1,000 + 500).
Get My Leads
Retrieve all leads you've pushed, with filtering and pagination. Only returns leads associated with your API
key.
GET
/lead/v1/public/my-leads
Query Parameters
PARAMETER
TYPE
DESCRIPTION
page
number
Optional
Page number (default: 1 )
limit
number
Optional
Results per page (default: 50 )
status
string
Optional
Filter by lead status (e.g. New , Contacted )
email
string
Optional
Search by email (partial match)
fromDate
string
Optional
Start date filter (ISO format: 2026-01-01 )
toDate
string
Optional
End date filter (ISO format: 2026-12-31 )
Example Request
GET /lead/v1/public/my-leads?page=1&limit=20&status=New&fromDate=2026-01-01
Response
{
}
"status": 200,
"data": {
"leads": [
      {
"_id": "6651a3f4b8e9c12d4f000001",
"firstName": "John",
"lastName": "Doe",
"email": "john@example.com",
"phone": "+1234567890",
"status": "New",
"createdAt": "2026-02-26T10:30:00.000Z",
"updatedAt": "2026-02-26T10:30:00.000Z"
      }
// ... more leads
    ],
"pagination": {
"page": 1,
"limit": 20,
"totalCount": 485,
"totalPages": 25
    }
  },
"message": "Leads retrieved successfully"
Get Lead Status
Check the current status of a specific lead by its ID. You can only view leads pushed through your API key.
/lead/v1/public/status/:leadId
GET
URL Parameters
TYPE
DESCRIPTION
PARAMETER
leadId
Example Request
string
REQUIRED
The lead ID returned when the lead was created
GET /lead/v1/public/status/6651a3f4b8e9c12d4f000001
Response
{
}
"status": 200,
"data": {
"id": "6651a3f4b8e9c12d4f000001",
"email": "john@example.com",
"firstName": "John",
"lastName": "Doe",
"status": "Contacted",
"createdAt": "2026-02-26T10:30:00.000Z",
"updatedAt": "2026-02-26T14:15:00.000Z"
  },
"message": "Lead status retrieved successfully"
Lead Not Found
{
"status": 404,
"data": {
"RESULT": "ERROR",
"message": "Lead not found or access denied"
  }
}
Full Batch Flow
Here's a typical workflow for pushing a large number of leads and tracking their statuses:
1
2
3
4
Push your leads in batches
Split your leads into chunks of up to 1,000 and send each chunk to POST
/lead/v1/public/batch . Store the returned lead IDs from each response.
Check the summary
Each batch response includes a summary telling you exactly how many were created, skipped
as duplicates, or had errors. Log this for your records.
Track statuses over time
Use GET /lead/v1/public/my-leads to periodically check your leads. Filter by status ,
fromDate / toDate , or email to find what you need.
Check individual leads
Use GET /lead/v1/public/status/:leadId with the lead ID to get the real-time status of any
specific lead.
Python Example
Batch push with splitting
import requests
import json
API_KEY = "your-api-key-here"
BASE_URL = "https://perfectoscrmus.com/lead/v1"
headers = {
"Authorization": f"Bearer {API_KEY}",
Copy
    "Content-Type": "application/json"
}
# Your leads list (can be any size)
all_leads = [
    {"email": f"lead{i}@example.com", "firstName": f"Lead {i}", "phone": f"+123000{i}"}
    for i in range(2500)
]
# Split into chunks of 1,000
BATCH_SIZE = 1000
total_created = 0
total_duplicates = 0
all_ids = []
for i in range(0, len(all_leads), BATCH_SIZE):
    batch = all_leads[i:i + BATCH_SIZE]
    print(f"Pushing batch {i // BATCH_SIZE + 1} ({len(batch)} leads)...")
    response = requests.post(
        f"{BASE_URL}/public/batch",
        headers=headers,
        json={"leads": batch}
    )
    data = response.json()
    summary = data["data"]["summary"]
    print(f"  Created: {summary['created']}, Duplicates: {summary['duplicates']}, Errors: {summ
    total_created += summary["created"]
    total_duplicates += summary["duplicates"]
    all_ids += [lead["id"] for lead in data["data"]["created"]]
print(f"\nDone! Total created: {total_created}, Total duplicates: {total_duplicates}")
# Check all leads later
response = requests.get(
    f"{BASE_URL}/public/my-leads?page=1&limit=50",
    headers=headers
)
my_leads = response.json()
print(f"Total leads on file: {my_leads['data']['pagination']['totalCount']}")
PHP Example
Batch push with cURL
<?php
$apiKey  = "your-api-key-here";
$baseUrl = "https://perfectoscrmus.com/lead/v1";
// Your leads array
$allLeads = [];
for ($i = 0; $i < 1500; $i++) {
    $allLeads[] = [
        "email"     => "lead{$i}@example.com",
        "firstName" => "Lead {$i}",
        "phone"     => "+123000{$i}",
    ];
}
// Split into batches of 1,000
$batches = array_chunk($allLeads, 1000);
$totalCreated = 0;
foreach ($batches as $index => $batch) {
    echo "Pushing batch " . ($index + 1) . " (" . count($batch) . " leads)...\n";
    $ch = curl_init("{$baseUrl}/public/batch");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$apiKey}",
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode(["leads" => $batch]),
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    $summary = $data["data"]["summary"];
Copy
Node.js Example
Batch push with fetch
    echo "  Created: {$summary['created']}, Duplicates: {$summary['duplicates']}\n";
    $totalCreated += $summary["created"];
}
echo "Done! Total created: {$totalCreated}\n";
// Check status of all your leads
$ch = curl_init("{$baseUrl}/public/my-leads?page=1&limit=50");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$apiKey}"],
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Total leads on file: {$response['data']['pagination']['totalCount']}\n";
?>
const API_KEY = "your-api-key-here";
const BASE_URL = "https://perfectoscrmus.com/lead/v1";
const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};
// Generate example leads
const allLeads = Array.from({ length: 2500 }, (_, i) => ({
  email: `lead${i}@example.com`,
  firstName: `Lead ${i}`,
  phone: `+123000${i}`
}));
async function pushAllLeads() {
Copy
  const BATCH_SIZE = 1000;
  let totalCreated = 0;
  const allCreatedIds = [];
  for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
    const batch = allLeads.slice(i, i + BATCH_SIZE);
    console.log(`Pushing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} leads)...`);
    const res = await fetch(`${BASE_URL}/public/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ leads: batch })
    });
    const data = await res.json();
    const { summary, created } = data.data;
    console.log(`  Created: ${summary.created}, Duplicates: ${summary.duplicates}, Errors: ${su
    totalCreated += summary.created;
    allCreatedIds.push(...created.map(l => l.id));
  }
  console.log(`\nDone! Total created: ${totalCreated}`);
  // Check all leads
  const leadsRes = await fetch(`${BASE_URL}/public/my-leads?page=1&limit=50`, { headers });
  const leadsData = await leadsRes.json();
  console.log(`Total leads on file: ${leadsData.data.pagination.totalCount}`);
  // Check a specific lead status
  if (allCreatedIds.length > 0) {
    const statusRes = await fetch(`${BASE_URL}/public/status/${allCreatedIds[0]}`, { headers })
    const statusData = await statusRes.json();
    console.log("First lead status:", statusData.data.status);
  }
}
pushAllLeads();
�
�
Need help? Contact your CRM administrator for API key provisioning, custom configuration, or any
questions about the API.