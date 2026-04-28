# Flutter Implementation Guide - Booking Flow

**Date:** April 28, 2026  
**Audience:** Flutter Developers  
**Purpose:** Quick start guide for implementing booking flow in Flutter app

---

## Quick Start

### Step 1: Setup API Client

```dart
class BookingApiClient {
  final String baseUrl = 'https://api.yourapp.com/api/v1';
  final String token; // Customer access token
  
  BookingApiClient(this.token);
  
  Future<http.Response> get(String endpoint, {Map<String, String>? params}) async {
    final uri = Uri.parse('$baseUrl$endpoint').replace(queryParameters: params);
    return await http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
  }
  
  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    return await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
  }
  
  Future<http.Response> delete(String endpoint) async {
    return await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
  }
}
```

---

## Complete Booking Flow Implementation

### Step 1: Discover Nearby Shops

```dart
class ShopDiscoveryScreen extends StatefulWidget {
  @override
  _ShopDiscoveryScreenState createState() => _ShopDiscoveryScreenState();
}

class _ShopDiscoveryScreenState extends State<ShopDiscoveryScreen> {
  List<Shop> shops = [];
  bool loading = true;
  
  @override
  void initState() {
    super.initState();
    loadNearbyShops();
  }
  
  Future<void> loadNearbyShops() async {
    try {
      // Get user's current location
      Position position = await Geolocator.getCurrentPosition();
      
      // Call API
      final response = await http.get(
        Uri.parse('$baseUrl/shops/nearby').replace(queryParameters: {
          'latitude': position.latitude.toString(),
          'longitude': position.longitude.toString(),
          'radius': '5000', // 5km radius
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          shops = (data['data'] as List)
              .map((json) => Shop.fromJson(json))
              .toList();
          loading = false;
        });
      }
    } catch (e) {
      print('Error loading shops: $e');
      setState(() => loading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (loading) return CircularProgressIndicator();
    
    return ListView.builder(
      itemCount: shops.length,
      itemBuilder: (context, index) {
        final shop = shops[index];
        return ShopCard(
          shop: shop,
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ShopDetailsScreen(shopId: shop.id),
            ),
          ),
        );
      },
    );
  }
}
```

---

### Step 2: View Shop Details & Services

```dart
class ShopDetailsScreen extends StatefulWidget {
  final String shopId;
  
  ShopDetailsScreen({required this.shopId});
  
  @override
  _ShopDetailsScreenState createState() => _ShopDetailsScreenState();
}

class _ShopDetailsScreenState extends State<ShopDetailsScreen> {
  Shop? shop;
  List<Employee> employees = [];
  List<Service> selectedServices = [];
  bool loading = true;
  
  @override
  void initState() {
    super.initState();
    loadShopDetails();
    loadEmployees();
  }
  
  Future<void> loadShopDetails() async {
    final response = await http.get(
      Uri.parse('$baseUrl/shops/${widget.shopId}'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setState(() {
        shop = Shop.fromJson(data['data']);
      });
    }
  }
  
  Future<void> loadEmployees() async {
    final response = await http.get(
      Uri.parse('$baseUrl/shops/${widget.shopId}/employees'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setState(() {
        employees = (data['data']['employees'] as List)
            .map((json) => Employee.fromJson(json))
            .toList();
        loading = false;
      });
    }
  }
  
  void toggleService(Service service) {
    setState(() {
      if (selectedServices.contains(service)) {
        selectedServices.remove(service);
      } else {
        selectedServices.add(service);
      }
    });
  }
  
  int get totalPrice => selectedServices.fold(
    0, 
    (sum, service) => sum + service.price,
  );
  
  int get totalDuration => selectedServices.fold(
    0, 
    (sum, service) => sum + service.duration,
  );
  
  @override
  Widget build(BuildContext context) {
    if (loading) return CircularProgressIndicator();
    
    return Scaffold(
      appBar: AppBar(title: Text(shop?.name ?? '')),
      body: Column(
        children: [
          // Shop info
          ShopInfoCard(shop: shop!),
          
          // Services list
          Expanded(
            child: ListView.builder(
              itemCount: shop!.services.length,
              itemBuilder: (context, index) {
                final service = shop!.services[index];
                return ServiceCard(
                  service: service,
                  selected: selectedServices.contains(service),
                  onTap: () => toggleService(service),
                );
              },
            ),
          ),
          
          // Selected services summary
          if (selectedServices.isNotEmpty)
            SelectedServicesSummary(
              services: selectedServices,
              totalPrice: totalPrice,
              totalDuration: totalDuration,
              onProceed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => EmployeeSelectionScreen(
                    shopId: widget.shopId,
                    employees: employees,
                    selectedServices: selectedServices,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
```

---

### Step 3: Select Employee & Check Availability

```dart
class EmployeeSelectionScreen extends StatefulWidget {
  final String shopId;
  final List<Employee> employees;
  final List<Service> selectedServices;
  
  EmployeeSelectionScreen({
    required this.shopId,
    required this.employees,
    required this.selectedServices,
  });
  
  @override
  _EmployeeSelectionScreenState createState() => _EmployeeSelectionScreenState();
}

class _EmployeeSelectionScreenState extends State<EmployeeSelectionScreen> {
  Employee? selectedEmployee;
  DateTime selectedDate = DateTime.now().add(Duration(days: 1));
  Map<String, List<TimeSlot>> availability = {};
  bool loadingAvailability = false;
  
  Future<void> loadAvailability(Employee employee) async {
    setState(() => loadingAvailability = true);
    
    try {
      final serviceIds = widget.selectedServices.map((s) => s.id).toList();
      final params = {
        'date': DateFormat('yyyy-MM-dd').format(selectedDate),
      };
      
      // Add multiple serviceId parameters
      for (var i = 0; i < serviceIds.length; i++) {
        params['serviceId[$i]'] = serviceIds[i];
      }
      
      final response = await http.get(
        Uri.parse('$baseUrl/employees/${employee.id}/available-slots')
            .replace(queryParameters: params),
        headers: {'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          availability[employee.id] = (data['data']['slots'] as List)
              .map((json) => TimeSlot.fromJson(json))
              .toList();
          loadingAvailability = false;
        });
      }
    } catch (e) {
      print('Error loading availability: $e');
      setState(() => loadingAvailability = false);
    }
  }
  
  void selectEmployee(Employee employee) {
    setState(() => selectedEmployee = employee);
    loadAvailability(employee);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Select Employee & Time')),
      body: Column(
        children: [
          // Date picker
          DatePicker(
            selectedDate: selectedDate,
            onDateChanged: (date) {
              setState(() => selectedDate = date);
              if (selectedEmployee != null) {
                loadAvailability(selectedEmployee!);
              }
            },
          ),
          
          // Employee list
          Expanded(
            child: ListView.builder(
              itemCount: widget.employees.length,
              itemBuilder: (context, index) {
                final employee = widget.employees[index];
                return EmployeeCard(
                  employee: employee,
                  selected: selectedEmployee == employee,
                  onTap: () => selectEmployee(employee),
                );
              },
            ),
          ),
          
          // Time slots (if employee selected)
          if (selectedEmployee != null && !loadingAvailability)
            TimeSlotGrid(
              slots: availability[selectedEmployee!.id] ?? [],
              onSlotSelected: (slot) => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => BookingConfirmationScreen(
                    shopId: widget.shopId,
                    employee: selectedEmployee!,
                    services: widget.selectedServices,
                    date: selectedDate,
                    time: slot.time,
                  ),
                ),
              ),
            ),
          
          if (loadingAvailability)
            CircularProgressIndicator(),
        ],
      ),
    );
  }
}
```

---

### Step 4: Create Booking

```dart
class BookingConfirmationScreen extends StatelessWidget {
  final String shopId;
  final Employee employee;
  final List<Service> services;
  final DateTime date;
  final String time;
  
  BookingConfirmationScreen({
    required this.shopId,
    required this.employee,
    required this.services,
    required this.date,
    required this.time,
  });
  
  Future<void> createBooking(BuildContext context) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'shopId': shopId,
          'employeeId': employee.id,
          'serviceId': services.map((s) => s.id).toList(),
          'date': DateFormat('yyyy-MM-dd').format(date),
          'time': time,
        }),
      );
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final bookingId = data['data']['bookingId'];
        
        // Navigate to payment
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentScreen(bookingId: bookingId),
          ),
        );
      } else {
        // Show error
        final error = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error['message'])),
        );
      }
    } catch (e) {
      print('Error creating booking: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create booking')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final totalPrice = services.fold(0, (sum, s) => sum + s.price);
    final totalDuration = services.fold(0, (sum, s) => sum + s.duration);
    
    return Scaffold(
      appBar: AppBar(title: Text('Confirm Booking')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Employee: ${employee.name}', style: TextStyle(fontSize: 18)),
            SizedBox(height: 8),
            Text('Date: ${DateFormat('MMM dd, yyyy').format(date)}'),
            Text('Time: $time'),
            SizedBox(height: 16),
            Text('Services:', style: TextStyle(fontWeight: FontWeight.bold)),
            ...services.map((s) => Text('- ${s.name} (₹${s.price}, ${s.duration} min)')),
            SizedBox(height: 16),
            Text('Total: ₹$totalPrice', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text('Duration: $totalDuration minutes'),
            Spacer(),
            ElevatedButton(
              onPressed: () => createBooking(context),
              child: Text('Proceed to Payment'),
              style: ElevatedButton.styleFrom(
                minimumSize: Size(double.infinity, 50),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### Step 5: Initiate Payment

```dart
class PaymentScreen extends StatefulWidget {
  final String bookingId;
  
  PaymentScreen({required this.bookingId});
  
  @override
  _PaymentScreenState createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool loading = true;
  String? paymentUrl;
  
  @override
  void initState() {
    super.initState();
    initiatePayment();
  }
  
  Future<void> initiatePayment() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/payments/initiate'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'bookingId': widget.bookingId,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          paymentUrl = data['data']['paymentUrl'];
          loading = false;
        });
      }
    } catch (e) {
      print('Error initiating payment: $e');
      setState(() => loading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (loading) return CircularProgressIndicator();
    
    return Scaffold(
      appBar: AppBar(title: Text('Payment')),
      body: WebView(
        initialUrl: paymentUrl,
        javascriptMode: JavascriptMode.unrestricted,
        onPageFinished: (url) {
          // Check if payment completed
          if (url.contains('payment-success')) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => BookingSuccessScreen(
                  bookingId: widget.bookingId,
                ),
              ),
            );
          }
        },
      ),
    );
  }
}
```

---

## Multi-Service Booking Example

```dart
class MultiServiceBooking {
  // Example: Customer selects multiple services
  
  List<Service> selectedServices = [
    Service(id: 'haircut_id', name: 'Haircut', price: 300, duration: 30),
    Service(id: 'beard_trim_id', name: 'Beard Trim', price: 150, duration: 20),
    Service(id: 'hair_color_id', name: 'Hair Color', price: 500, duration: 60),
  ];
  
  // Calculate totals
  int get totalPrice => selectedServices.fold(0, (sum, s) => sum + s.price);
  // Result: 950
  
  int get totalDuration => selectedServices.fold(0, (sum, s) => sum + s.duration);
  // Result: 110 minutes
  
  // Check availability for multiple services
  Future<void> checkAvailability(String employeeId, DateTime date) async {
    final params = {
      'date': DateFormat('yyyy-MM-dd').format(date),
    };
    
    // Add multiple serviceId parameters
    for (var i = 0; i < selectedServices.length; i++) {
      params['serviceId[$i]'] = selectedServices[i].id;
    }
    
    final response = await http.get(
      Uri.parse('$baseUrl/employees/$employeeId/available-slots')
          .replace(queryParameters: params),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    // Backend automatically:
    // - Calculates total duration (110 minutes)
    // - Returns only slots that can fit 110 minutes
    // - Blocks overlapping slots
  }
  
  // Create booking with multiple services
  Future<void> createBooking(String shopId, String employeeId, DateTime date, String time) async {
    final response = await http.post(
      Uri.parse('$baseUrl/bookings'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'shopId': shopId,
        'employeeId': employeeId,
        'serviceId': selectedServices.map((s) => s.id).toList(), // Array of IDs
        'date': DateFormat('yyyy-MM-dd').format(date),
        'time': time,
      }),
    );
    
    // Backend automatically:
    // - Validates all services
    // - Calculates total price (₹950)
    // - Calculates total duration (110 minutes)
    // - Claims multiple slots (10:00, 10:30, 11:00, 11:30)
    // - Creates booking
  }
}
```

---

## Booking Management

### View Bookings

```dart
class MyBookingsScreen extends StatefulWidget {
  @override
  _MyBookingsScreenState createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<Booking> upcomingBookings = [];
  List<Booking> pastBookings = [];
  bool loading = true;
  
  @override
  void initState() {
    super.initState();
    loadBookings();
  }
  
  Future<void> loadBookings() async {
    // Load upcoming bookings
    final upcomingResponse = await http.get(
      Uri.parse('$baseUrl/bookings').replace(queryParameters: {
        'type': 'upcoming',
        'page': '1',
        'limit': '10',
      }),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    // Load past bookings
    final pastResponse = await http.get(
      Uri.parse('$baseUrl/bookings').replace(queryParameters: {
        'type': 'past',
        'page': '1',
        'limit': '10',
      }),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (upcomingResponse.statusCode == 200 && pastResponse.statusCode == 200) {
      final upcomingData = jsonDecode(upcomingResponse.body);
      final pastData = jsonDecode(pastResponse.body);
      
      setState(() {
        upcomingBookings = (upcomingData['data'] as List)
            .map((json) => Booking.fromJson(json))
            .toList();
        pastBookings = (pastData['data'] as List)
            .map((json) => Booking.fromJson(json))
            .toList();
        loading = false;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (loading) return CircularProgressIndicator();
    
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('My Bookings'),
          bottom: TabBar(
            tabs: [
              Tab(text: 'Upcoming'),
              Tab(text: 'Past'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            BookingList(bookings: upcomingBookings),
            BookingList(bookings: pastBookings),
          ],
        ),
      ),
    );
  }
}
```

---

### Cancel Booking

```dart
Future<void> cancelBooking(BuildContext context, String bookingId) async {
  // Show confirmation dialog
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Cancel Booking'),
      content: Text('Are you sure you want to cancel this booking? Cancellation fees may apply.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text('No'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text('Yes'),
        ),
      ],
    ),
  );
  
  if (confirmed != true) return;
  
  try {
    final response = await http.delete(
      Uri.parse('$baseUrl/bookings/$bookingId'),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (response.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking cancelled successfully')),
      );
      // Refresh bookings list
    } else {
      final error = jsonDecode(response.body);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error['message'])),
      );
    }
  } catch (e) {
    print('Error cancelling booking: $e');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to cancel booking')),
    );
  }
}
```

---

## Error Handling

```dart
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  @override
  String toString() => message;
}

Future<T> handleApiCall<T>(Future<http.Response> Function() apiCall) async {
  try {
    final response = await apiCall();
    final data = jsonDecode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data['data'] as T;
    } else {
      throw ApiException(
        data['message'] ?? 'An error occurred',
        response.statusCode,
      );
    }
  } on SocketException {
    throw ApiException('No internet connection');
  } on FormatException {
    throw ApiException('Invalid response format');
  } catch (e) {
    throw ApiException('An unexpected error occurred: $e');
  }
}

// Usage
try {
  final shops = await handleApiCall<List<Shop>>(() async {
    return await http.get(Uri.parse('$baseUrl/shops/nearby'));
  });
} on ApiException catch (e) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(e.message)),
  );
}
```

---

## Data Models

```dart
class Shop {
  final String id;
  final String name;
  final String address;
  final double rating;
  final List<Service> services;
  
  Shop({
    required this.id,
    required this.name,
    required this.address,
    required this.rating,
    required this.services,
  });
  
  factory Shop.fromJson(Map<String, dynamic> json) {
    return Shop(
      id: json['_id'],
      name: json['shopName'],
      address: json['address'],
      rating: json['rating']?.toDouble() ?? 0.0,
      services: (json['services'] as List?)
          ?.map((s) => Service.fromJson(s))
          .toList() ?? [],
    );
  }
}

class Service {
  final String id;
  final String name;
  final int price;
  final int duration;
  final String? serviceType; // 'single' or 'bundled'
  
  Service({
    required this.id,
    required this.name,
    required this.price,
    required this.duration,
    this.serviceType,
  });
  
  factory Service.fromJson(Map<String, dynamic> json) {
    return Service(
      id: json['_id'],
      name: json['serviceName'],
      price: json['finalPrice'] ?? json['totalPrice'] ?? 0,
      duration: json['duration'] ?? json['totalDuration'] ?? 0,
      serviceType: json['serviceType'],
    );
  }
}

class Employee {
  final String id;
  final String name;
  final String? photoUrl;
  
  Employee({
    required this.id,
    required this.name,
    this.photoUrl,
  });
  
  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'],
      name: '${json['firstName']} ${json['lastName']}',
      photoUrl: json['photoUrl'],
    );
  }
}

class TimeSlot {
  final String time;
  final bool available;
  final String? reason;
  
  TimeSlot({
    required this.time,
    required this.available,
    this.reason,
  });
  
  factory TimeSlot.fromJson(Map<String, dynamic> json) {
    return TimeSlot(
      time: json['time'],
      available: json['available'],
      reason: json['reason'],
    );
  }
}

class Booking {
  final String id;
  final String shopName;
  final String employeeName;
  final List<String> services;
  final DateTime date;
  final String time;
  final int totalAmount;
  final String status;
  
  Booking({
    required this.id,
    required this.shopName,
    required this.employeeName,
    required this.services,
    required this.date,
    required this.time,
    required this.totalAmount,
    required this.status,
  });
  
  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['_id'],
      shopName: json['shopId']['shopName'],
      employeeName: '${json['employeeId']['firstName']} ${json['employeeId']['lastName']}',
      services: (json['services'] as List).map((s) => s['serviceName'] as String).toList(),
      date: DateTime.parse(json['date']),
      time: json['time'],
      totalAmount: json['totalAmount'],
      status: json['status'],
    );
  }
}
```

---

## Best Practices

### 1. Always Check Availability Before Booking

```dart
// ❌ BAD: Create booking without checking availability
await createBooking(shopId, employeeId, date, time);

// ✅ GOOD: Check availability first
final slots = await getAvailableSlots(employeeId, date, serviceIds);
if (slots.any((slot) => slot.time == time && slot.available)) {
  await createBooking(shopId, employeeId, date, time);
} else {
  showError('Selected time slot is not available');
}
```

### 2. Handle Multi-Service Selection Properly

```dart
// ✅ Calculate totals before showing to user
int totalPrice = selectedServices.fold(0, (sum, s) => sum + s.price);
int totalDuration = selectedServices.fold(0, (sum, s) => sum + s.duration);

// ✅ Validate before proceeding
if (selectedServices.isEmpty) {
  showError('Please select at least one service');
  return;
}

if (selectedServices.length > 10) {
  showError('Cannot select more than 10 services');
  return;
}

if (totalDuration > 480) {
  showError('Total duration cannot exceed 8 hours');
  return;
}
```

### 3. Show Loading States

```dart
// ✅ Always show loading indicators
setState(() => loading = true);
try {
  final result = await apiCall();
  // Handle result
} finally {
  setState(() => loading = false);
}
```

### 4. Handle Errors Gracefully

```dart
// ✅ Show user-friendly error messages
try {
  await createBooking(...);
} on ApiException catch (e) {
  if (e.statusCode == 400) {
    showError(e.message); // Show specific error from backend
  } else if (e.statusCode == 401) {
    // Redirect to login
  } else {
    showError('Something went wrong. Please try again.');
  }
}
```

---

## Testing Checklist

- [ ] Can discover nearby shops
- [ ] Can view shop details
- [ ] Can view employees
- [ ] Can select single service
- [ ] Can select multiple services
- [ ] Can select bundles
- [ ] Can check availability
- [ ] Can create booking
- [ ] Can initiate payment
- [ ] Can view bookings
- [ ] Can cancel booking
- [ ] Error handling works
- [ ] Loading states work
- [ ] Multi-service validation works

---

## Common Issues & Solutions

### Issue: "Employee not available at this date/time"
**Solution:** Always check availability before creating booking

### Issue: "Cannot select more than 10 services"
**Solution:** Limit service selection in UI to 10 services

### Issue: "Total booking duration cannot exceed 8 hours"
**Solution:** Show duration warning when approaching limit

### Issue: "Bundle service amount must be at least ₹300"
**Solution:** Validate total amount before allowing booking

---

**For complete API documentation, see:**
- BOOKING-FLOW.md
- COMPLETE-BOOKING-API-FLOW.md
- MULTI-SERVICE-BOOKING-GUIDE.md

