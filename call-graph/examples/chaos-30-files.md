# Realistic Sample: Retail Platform (30 Java Files)

このサンプルは、EC/小売基盤を想定した現実寄りの依存関係を持つ構成です。
Controller -> Service -> Repository/Integration を基本にしつつ、
通知・不正検知・レコメンド・返品などの横断機能が絡むため、依存はやや複雑です。

### src/main/java/com/example/retail/App.java
```java
package com.example.retail;

import com.example.retail.api.OrderController;
import com.example.retail.api.PaymentController;

public class App {
  public void runBatch() {
    new OrderController().submitOrder();
    new PaymentController().retryFailedPayment();
    healthCheck();
  }

  public void healthCheck() {
    new com.example.retail.service.NotificationService().notifyStatus();
    new com.example.retail.integration.AuditClient().record();
  }
}
```

### src/main/java/com/example/retail/api/OrderController.java
```java
package com.example.retail.api;

import com.example.retail.service.OrderService;

public class OrderController {
  public void submitOrder() {
    new OrderService().placeOrder();
    new OrderService().validate();
  }

  public void cancelOrder() {
    new OrderService().cancelOrder();
    new OrderService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/api/PaymentController.java
```java
package com.example.retail.api;

import com.example.retail.service.PaymentService;

public class PaymentController {
  public void pay() {
    new PaymentService().authorize();
    new PaymentService().capture();
  }

  public void retryFailedPayment() {
    new PaymentService().retry();
    new PaymentService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/api/ShipmentController.java
```java
package com.example.retail.api;

import com.example.retail.service.ShipmentService;

public class ShipmentController {
  public void ship() {
    new ShipmentService().createShipment();
    new ShipmentService().dispatch();
  }

  public void track() {
    new ShipmentService().trackShipment();
    new ShipmentService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/api/CustomerController.java
```java
package com.example.retail.api;

import com.example.retail.service.CustomerService;

public class CustomerController {
  public void register() {
    new CustomerService().registerCustomer();
    new CustomerService().validate();
  }

  public void profile() {
    new CustomerService().loadProfile();
    new CustomerService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/OrderService.java
```java
package com.example.retail.service;

import com.example.retail.repository.OrderRepository;
import com.example.retail.repository.InventoryRepository;

public class OrderService {
  public void placeOrder() {
    validate();
    new InventoryService().reserveStock();
    new PricingService().calculateTotal();
    new OrderRepository().save();
    new NotificationService().notifyStatus();
    new RecommendationService().refreshRecommendations();
  }

  public void cancelOrder() {
    new InventoryService().releaseStock();
    new OrderRepository().updateStatus();
    new PaymentService().refund();
    new NotificationService().notifyStatus();
  }

  public void validate() {
    new FraudService().validate();
    new InventoryRepository().validate();
  }

  public void notifyStatus() {
    new NotificationService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/PaymentService.java
```java
package com.example.retail.service;

import com.example.retail.integration.PaymentGatewayClient;
import com.example.retail.repository.PaymentRepository;

public class PaymentService {
  public void authorize() {
    validate();
    new PaymentGatewayClient().authorize();
    new PaymentRepository().save();
    new FraudService().score();
  }

  public void capture() {
    new PaymentGatewayClient().capture();
    new PaymentRepository().updateStatus();
    notifyStatus();
  }

  public void refund() {
    new PaymentGatewayClient().refund();
    new PaymentRepository().updateStatus();
    new ReturnsService().openCase();
  }

  public void retry() {
    authorize();
    capture();
  }

  public void validate() {
    new FraudService().validate();
    new PaymentRepository().validate();
  }

  public void notifyStatus() {
    new NotificationService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/InventoryService.java
```java
package com.example.retail.service;

import com.example.retail.integration.WarehouseClient;
import com.example.retail.repository.InventoryRepository;

public class InventoryService {
  public void reserveStock() {
    validate();
    new WarehouseClient().reserve();
    new InventoryRepository().save();
  }

  public void releaseStock() {
    new WarehouseClient().release();
    new InventoryRepository().updateStatus();
  }

  public void validate() {
    new InventoryRepository().validate();
  }
}
```

### src/main/java/com/example/retail/service/ShipmentService.java
```java
package com.example.retail.service;

import com.example.retail.integration.CarrierClient;
import com.example.retail.repository.ShipmentRepository;

public class ShipmentService {
  public void createShipment() {
    validate();
    new ShipmentRepository().save();
    new CarrierClient().createLabel();
  }

  public void dispatch() {
    new CarrierClient().dispatch();
    new ShipmentRepository().updateStatus();
    notifyStatus();
  }

  public void trackShipment() {
    new CarrierClient().track();
    new ShipmentRepository().save();
  }

  public void validate() {
    new ShipmentRepository().validate();
  }

  public void notifyStatus() {
    new NotificationService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/PricingService.java
```java
package com.example.retail.service;

public class PricingService {
  public void calculateTotal() {
    validate();
    applyCampaign();
  }

  public void applyCampaign() {
    new RecommendationService().evaluateContext();
    new com.example.retail.integration.AuditClient().record();
  }

  public void validate() {
    new CustomerService().validate();
  }
}
```

### src/main/java/com/example/retail/service/FraudService.java
```java
package com.example.retail.service;

public class FraudService {
  public void score() {
    validate();
    new com.example.retail.integration.AuditClient().record();
  }

  public void validate() {
    new CustomerService().validate();
    new com.example.retail.integration.AuditClient().record();
  }
}
```

### src/main/java/com/example/retail/service/NotificationService.java
```java
package com.example.retail.service;

import com.example.retail.integration.MailClient;

public class NotificationService {
  public void notifyStatus() {
    new MailClient().send();
    new com.example.retail.integration.AuditClient().record();
  }

  public void notifyPaymentFailure() {
    new MailClient().send();
    notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/CustomerService.java
```java
package com.example.retail.service;

import com.example.retail.repository.CustomerRepository;

public class CustomerService {
  public void registerCustomer() {
    validate();
    new CustomerRepository().save();
    new NotificationService().notifyStatus();
  }

  public void loadProfile() {
    new CustomerRepository().findById();
    new RecommendationService().refreshRecommendations();
  }

  public void validate() {
    new CustomerRepository().validate();
  }

  public void notifyStatus() {
    new NotificationService().notifyStatus();
  }
}
```

### src/main/java/com/example/retail/service/RecommendationService.java
```java
package com.example.retail.service;

public class RecommendationService {
  public void refreshRecommendations() {
    evaluateContext();
    new NotificationService().notifyStatus();
  }

  public void evaluateContext() {
    new CustomerService().loadProfile();
    new com.example.retail.integration.AuditClient().record();
  }
}
```

### src/main/java/com/example/retail/service/ReturnsService.java
```java
package com.example.retail.service;

public class ReturnsService {
  public void openCase() {
    validate();
    new OrderService().notifyStatus();
    new ShipmentService().notifyStatus();
  }

  public void approve() {
    new PaymentService().refund();
    new InventoryService().releaseStock();
  }

  public void validate() {
    new FraudService().validate();
  }
}
```
`r`n
### src/main/java/com/example/retail/repository/OrderRepository.java
```java
package com.example.retail.repository;

public class OrderRepository {
  public void save() {
    validate();
  }

  public void updateStatus() {
    save();
  }

  public void validate() {
  }
}
```

### src/main/java/com/example/retail/repository/PaymentRepository.java
```java
package com.example.retail.repository;

public class PaymentRepository {
  public void save() {
    validate();
  }

  public void updateStatus() {
    save();
  }

  public void validate() {
  }
}
```

### src/main/java/com/example/retail/repository/InventoryRepository.java
```java
package com.example.retail.repository;

public class InventoryRepository {
  public void save() {
    validate();
  }

  public void updateStatus() {
    save();
  }

  public void validate() {
  }
}
```

### src/main/java/com/example/retail/repository/ShipmentRepository.java
```java
package com.example.retail.repository;

public class ShipmentRepository {
  public void save() {
    validate();
  }

  public void updateStatus() {
    save();
  }

  public void validate() {
  }
}
```

### src/main/java/com/example/retail/repository/CustomerRepository.java
```java
package com.example.retail.repository;

public class CustomerRepository {
  public void save() {
    validate();
  }

  public void findById() {
    validate();
  }

  public void validate() {
  }
}
```

### src/main/java/com/example/retail/domain/Order.java
```java
package com.example.retail.domain;

public class Order {
  public void validate() {
    calculateTotal();
  }

  public void calculateTotal() {
  }
}
```

### src/main/java/com/example/retail/domain/OrderItem.java
```java
package com.example.retail.domain;

public class OrderItem {
  public void validate() {
    recalculate();
  }

  public void recalculate() {
  }
}
```

### src/main/java/com/example/retail/domain/Payment.java
```java
package com.example.retail.domain;

public class Payment {
  public void validate() {
    markAuthorized();
  }

  public void markAuthorized() {
  }
}
```

### src/main/java/com/example/retail/domain/Shipment.java
```java
package com.example.retail.domain;

public class Shipment {
  public void validate() {
    markDispatched();
  }

  public void markDispatched() {
  }
}
```

### src/main/java/com/example/retail/domain/Customer.java
```java
package com.example.retail.domain;

public class Customer {
  public void validate() {
    normalize();
  }

  public void normalize() {
  }
}
```

### src/main/java/com/example/retail/integration/PaymentGatewayClient.java
```java
package com.example.retail.integration;

public class PaymentGatewayClient {
  public void authorize() {
    record();
  }

  public void capture() {
    record();
  }

  public void refund() {
    record();
  }

  public void record() {
  }
}
```

### src/main/java/com/example/retail/integration/WarehouseClient.java
```java
package com.example.retail.integration;

public class WarehouseClient {
  public void reserve() {
    record();
  }

  public void release() {
    record();
  }

  public void record() {
  }
}
```

### src/main/java/com/example/retail/integration/CarrierClient.java
```java
package com.example.retail.integration;

public class CarrierClient {
  public void createLabel() {
    record();
  }

  public void dispatch() {
    record();
  }

  public void track() {
    record();
  }

  public void record() {
  }
}
```

### src/main/java/com/example/retail/integration/MailClient.java
```java
package com.example.retail.integration;

public class MailClient {
  public void send() {
    record();
  }

  public void record() {
  }
}
```

### src/main/java/com/example/retail/integration/AuditClient.java
```java
package com.example.retail.integration;

public class AuditClient {
  public void record() {
    flush();
  }

  public void flush() {
  }
}
```

