export const BUGEESE_CONFIG = {
  brandName: "Bugeese",
  tagline: "100% Pure Vegetarian Burgers & Fast Casual",
  origin: "Founded in Jabalpur, India",
  description: "Handcrafted gourmet burgers, toasted paninis, crispy sides, and thick shakes made for bold cravings.",
  
  // Official Contact Info
  contact: {
    phone: "+91-9326340687",
    phoneDisplay: "+91 93263 40687",
    email: "bugeeseindia@gmail.com",
    address: "Vijay Nagar, Jabalpur, Madhya Pradesh 482002, India",
    outlets: [
      { name: "Vijay Nagar Outlet", location: "Vijay Nagar, Jabalpur, MP" },
      { name: "Wright Town Outlet", location: "Wright Town, Jabalpur, MP" },
      { name: "Napier Town / Vikas Nagar", location: "Napier Town, Jabalpur, MP" }
    ],
    hours: "11:00 AM – 11:30 PM (Mon – Sun)",
  },

  // Official Ordering destinations
  ordering: {
    zomato: {
      name: "Zomato",
      url: "https://www.zomato.com/jabalpur/restaurants/bugeese",
      note: "Live order listing on Zomato Jabalpur"
    },
    swiggy: {
      name: "Swiggy",
      url: "https://www.swiggy.com/city/jabalpur/bugeese-restaurants",
      note: "Live order listing on Swiggy Jabalpur"
    }
  },

  // Official Franchise Destination
  franchise: {
    title: "Bring the Bugeese Experience to Your City",
    url: "https://www.bugeese.com/",
    inquiryEmail: "bugeeseindia@gmail.com",
    inquiryPhone: "+91-9326340687"
  },

  // Social Links
  social: {
    instagram: "https://www.instagram.com/bugeeseindia/",
    facebook: "https://www.facebook.com/bugeeseindia/",
    website: "https://www.bugeese.com/"
  }
};

export const MENU_PREVIEW_ITEMS = [
  {
    id: "burgers",
    category: "BURGERS",
    title: "Burgers",
    description: "The star of the show. See every burger on the menu.",
    image: "/food/burger.jpg",
    alt: "Bugeese handcrafted pure vegetarian signature burger with sesame brioche bun and melted cheese",
    badge: "100% PURE VEG"
  },
  {
    id: "sides",
    category: "SIDES",
    title: "Sides",
    description: "Fries, nachos, cheese balls and more.",
    image: "/food/sides.jpg",
    alt: "Crispy golden peri peri fries and cheesy gourmet sides",
    badge: "CRISPY & FRESH"
  },
  {
    id: "combos",
    category: "COMBOS",
    title: "Combos",
    description: "Meals put together for a better deal.",
    image: "/food/combos.jpg",
    alt: "Complete Bugeese combo meal featuring burger, fries, and beverage",
    badge: "VALUE MEAL"
  }
];

export const FULL_MENU_DATA = [
  {
    id: "burgers",
    title: "Signature Gourmet Burgers",
    description: "Chef-crafted vegetarian burgers on toasted sesame buns.",
    category: "Signature Gourmet Burgers",
    items: [
      {
        id: "burger-americano-cheese",
        name: "Bugs Americano Cheese Burger",
        desc: "Chef-crafted American-style patty, molten cheddar melt, house gherkins & signature smoky mayo.",
        price: 149,
        image: "/food/burger.jpg",
        tag: "Bestseller"
      },
      {
        id: "burger-cheesy-peri-peri",
        name: "Bugs Cheesy Peri Peri Burger",
        desc: "Crispy spiced vegetable patty dusted with African bird's eye chili spices and warm cheese sauce.",
        price: 139,
        image: "/food/burger.jpg",
        tag: "Spicy"
      },
      {
        id: "burger-desi-makhani",
        name: "Desi Makhani Burger",
        desc: "Rich butter makhani gravy glaze over crispy patty with pickled onions on toasted brioche.",
        price: 159,
        image: "/food/burger.jpg",
        tag: "Chef Special"
      },
      {
        id: "burger-crispy-veg-classic",
        name: "Bugs Crispy Veg Classic Burger",
        desc: "Golden potato and fresh herb patty with crisp lettuce, ripe tomatoes, and herb garlic spread.",
        price: 99,
        image: "/food/burger.jpg",
        tag: "Classic"
      },
      {
        id: "burger-zesty-achari",
        name: "Bugs Zesty Achari Burger",
        desc: "Tangy pickled punch infused into herb patty layered with creamy spiced dressing.",
        price: 129,
        image: "/food/burger.jpg",
        tag: "Popular"
      },
      {
        id: "burger-king-double-patty",
        name: "Bugs King Double Patty Burger",
        desc: "Twin stacked grilled patties, double melted cheese slices, caramelized relish and rich dressing.",
        price: 199,
        image: "/food/burger.jpg",
        tag: "King Size"
      }
    ]
  },
  {
    id: "paninis",
    title: "Artisanal Toasted Paninis & Wraps",
    description: "Pressed hot with melted cheeses and house relishes.",
    category: "Artisanal Toasted Paninis & Wraps",
    items: [
      {
        id: "panini-tandoori-paneer",
        name: "Tandoori Paneer Panini Sandwich",
        desc: "Char-grilled marinated paneer cubes, crisp capsicum and tandoori drizzle pressed hot.",
        price: 169,
        image: "/food/combos.jpg",
        tag: "Must Try"
      },
      {
        id: "panini-american-cheese-corn",
        name: "American Cheese Corn Panini",
        desc: "Sweet American golden corn kernels folded into molten mozzarella and cheddar blend.",
        price: 149,
        image: "/food/combos.jpg",
        tag: "Cheesy"
      },
      {
        id: "panini-chilli-cheese",
        name: "Chilli Cheese Panini Sandwich",
        desc: "Sharp melted cheddar, jalapeños, green chillies, and herb butter pressed to golden crust.",
        price: 139,
        image: "/food/combos.jpg",
        tag: "Spicy"
      },
      {
        id: "panini-bugeese-special",
        name: "Bugeese Special Panini",
        desc: "Chef's assortment of exotic vegetables, signature herb cheese blend and house relish.",
        price: 179,
        image: "/food/combos.jpg",
        tag: "Signature"
      },
      {
        id: "wrap-tandoori-paneer",
        name: "Bugs Tandoori Paneer Wrap",
        desc: "Flaky tortilla roll wrapped around smoky grilled paneer, onions, and mint garlic dip.",
        price: 139,
        image: "/food/combos.jpg",
        tag: "Wrap"
      }
    ]
  },
  {
    id: "sides",
    title: "Fries & Cheesy Sides",
    description: "Golden crinkle fries and molten cheesy snacks.",
    category: "Fries & Cheesy Sides",
    items: [
      {
        id: "side-cheese-loaded-fries",
        name: "Cheese Loaded Fries",
        desc: "Crispy skin-on potato fries drenched in velvety warm cheese blend and herbs.",
        price: 119,
        image: "/food/sides.jpg",
        tag: "Favorite"
      },
      {
        id: "side-peri-peri-cheese-fries",
        name: "Peri Peri Cheese Fries",
        desc: "Crinkle fries tossed in zesty peri-peri dusting and topped with liquid cheddar.",
        price: 129,
        image: "/food/sides.jpg",
        tag: "Hot"
      },
      {
        id: "side-classic-salted-fries",
        name: "Classic Salted French Fries",
        desc: "Double-fried golden potato batons lightly tossed with sea salt crystals.",
        price: 89,
        image: "/food/sides.jpg",
        tag: "Classic"
      },
      {
        id: "side-garlic-bread-paneer",
        name: "Smokey Paneer Cheesy Garlic Bread",
        desc: "Toasted baguette slices rubbed with garlic butter, molten cheese, and smoked paneer bites.",
        price: 139,
        image: "/food/sides.jpg",
        tag: "Baked"
      },
      {
        id: "side-cheese-poppers",
        name: "Crispy Cheese Poppers",
        desc: "Crispy crumb bites with molten jalapeño cheese center served with garlic dip.",
        price: 109,
        image: "/food/sides.jpg",
        tag: "Snack"
      }
    ]
  },
  {
    id: "shakes",
    title: "Thick Shakes & Desserts",
    description: "Chilled dense shakes and warm dessert cakes.",
    category: "Thick Shakes & Desserts",
    items: [
      {
        id: "dessert-choco-lava-cake",
        name: "Warm Choco Lava Cake",
        desc: "Rich dark cocoa cake with molten chocolate river core dusted with powdered sugar.",
        price: 99,
        image: "/food/combos.jpg",
        tag: "Sweet"
      },
      {
        id: "shake-belgian-chocolate",
        name: "Belgian Chocolate Thick Shake",
        desc: "Dense, chilled chocolate shake whipped with rich chocolate fudge and cream.",
        price: 129,
        image: "/food/combos.jpg",
        tag: "Cold"
      },
      {
        id: "shake-brownie-fudge",
        name: "Brownie Fudge Shake",
        desc: "Chunks of gooey chocolate brownie blended into whole milk and chocolate ripple.",
        price: 139,
        image: "/food/combos.jpg",
        tag: "Indulgent"
      }
    ]
  }
];
