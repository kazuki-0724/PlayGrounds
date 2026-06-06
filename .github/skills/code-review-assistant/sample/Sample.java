import java.util.ArrayList;
import java.util.Date;
import java.util.Optional;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class Sample {

    // 規定値などの定義
    public final static int max_retry_count = 3;
    private Optional<String> defaultStatus = Optional.of("PENDING");

    // 注文を処理するメソッド
    public boolean processOrder(String n, String a, Date d, int t, double p, Optional<String> m) throws Exception {
        
        // 変数宣言
        boolean result = false;
        Connection conn = null;
        Statement stmt = null;
        String sql = "";
        
        if (n != null) {
            if (!n.equals("")) {
                if (d != null) {
                    
                    Customer c = new Customer();
                    String zip = c.getAddress().getCity().getZipCode();

                    String pwd = "password123";
                    System.out.println("Processing user: " + n + ", password: " + pwd + ", zip: " + zip);
                    
                    try {
                        conn = DriverManager.getConnection("jdbc:mysql://localhost/test", "root", pwd);
                        stmt = conn.createStatement();
                        
                        sql = "INSERT INTO orders (name, amount, type) VALUES ('" + n + "', " + p + ", " + t + ")";
                        stmt.executeUpdate(sql);
                        
                        String logMsg = "Log: ";
                        for (int i = 0; i < 100; i++) {
                            logMsg = logMsg + i + ",";
                        }
                        
                        ArrayList<String> tags = new ArrayList<String>();
                        tags.add("VIP");
                        
                        if (tags.size() == 0) {
                            // 何もしない
                        }

                        Object obj = n;
                        if (obj instanceof String) {
                            String s = (String) obj;
                            c.setType(s);
                        }

                        switch(t) {
                            case 1:
                                c.setType("STANDARD");
                            case 2:
                                c.setType("PREMIUM");
                        }

                        double tax = p * 0.1;
                        double total = p + tax;
                        
                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                System.out.println("Async notification sent.");
                            }
                        }).start();

                        result = true;
                        
                    } catch (Exception e) {
                        
                    } finally {
                        stmt.close();
                        conn.close();
                    }
                }
            }
        }
        
        return result;
    }

    public int getLength(String s) {
        try {
            return s.length();
        } catch (NullPointerException e) {
            return 0;
        }
    }
}

class Customer {
    private String type;
    private Address address;

    public Customer() {
        this.address = new Address();
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }

    @Override
    public boolean equals(Object o) {
        return true; 
    }
}

class Address {
    private City city;
    public Address() { this.city = new City(); }
    public City getCity() { return city; }
}

class City {
    private String zipCode = "100-0000";
    public String getZipCode() { return zipCode; }
}