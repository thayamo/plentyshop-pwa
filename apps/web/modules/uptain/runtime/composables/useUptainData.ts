import type { Cart, CartItem, Product, User, Order } from '@plentymarkets/shop-api';
import { cartGetters, productGetters, orderGetters, categoryGetters, categoryTreeGetters, tagGetters, shippingProviderGetters, paymentProviderGetters, userAddressGetters, AddressType } from '@plentymarkets/shop-api';

export const useUptainData = () => {
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();
  const { data: cart } = useCart();
  const { user, isAuthorized } = useCustomer();
  const { wishlistItemIds } = useWishlist();
  const { getSetting } = useSiteSettings('uptainId');
  const { getSetting: getBlockCookies } = useSiteSettings('uptainBlockCookiesInitially');
  const { getSetting: getNewsletterData } = useSiteSettings('uptainTransmitNewsletterData');
  const { getSetting: getCustomerData } = useSiteSettings('uptainTransmitCustomerData');
  const { getSetting: getRevenue } = useSiteSettings('uptainTransmitRevenue');

  // Cache for calculated revenue
  const revenueCache = useState<string | null>('uptain-revenue-cache', () => null);

  const getPluginVersion = () => {
    return 'plentyshop-pwa_1.0.0';
  };

  const getReturnUrl = () => {
    const localePath = useLocalePath();
    return `${runtimeConfig.public.domain}${localePath('/cart')}`;
  };

  const getPageType = (): string => {
    const path = route.path;
    if (path.includes('/product/')) return 'product';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/checkout')) return 'checkout';
    if (path.includes('/confirmation/')) return 'success';
    if (path.includes('/search')) return 'search';
    if (path.includes('/tag/') || path.includes('/category/')) return 'category';
    if (path === '/' || path === '') return 'home';
    return 'other';
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (!price) return '0.00';
    return price.toFixed(2);
  };

  const getWishlistData = (): string => {
    // TODO: Implement wishlist data collection
    return '{}';
  };

  const getComparisonData = (): string => {
    // TODO: Implement comparison data collection
    return '{}';
  };

  const getCartData = () => {
    if (!cart.value || !cart.value.items || cart.value.items.length === 0) {
      return null;
    }

    const totals = cartGetters.getTotals(cart.value);
    const netTotal = cartGetters.getBasketAmountNet(cart.value);
    const currency = cartGetters.getCurrency(cart.value) || 'EUR';
    
    // Calculate total tax amount from all VATs
    const totalVats = totals.totalVats;
    const taxAmount = Array.isArray(totalVats) 
      ? totalVats.reduce((sum: number, vat: any) => {
          return sum + (cartGetters.getTotalVatAmount(vat) || 0);
        }, 0)
      : 0;
    
    const shippingCosts = cartGetters.getShippingAmountNet(cart.value) || 0;
    
    // Get payment costs from order properties (additional costs)
    // Payment costs might be included in order properties as additional costs
    const orderPropertiesWithVat = cartGetters.getOrderPropertiesAdditionalCostsWithVat(cart.value) || [];
    const orderPropertiesWithoutVat = cartGetters.getOrderPropertiesWithoutVat(cart.value) || [];
    
    // Calculate payment costs from order properties
    // Note: This might not be 100% accurate as order properties can include other costs too
    let paymentCosts = 0;
    [...orderPropertiesWithVat, ...orderPropertiesWithoutVat].forEach((property: any) => {
      // Check if this property is related to payment (this is a best guess)
      // In practice, payment costs might be stored differently
      if (property?.price) {
        paymentCosts += property.price;
      }
    });

    const products: Record<string, any> = {};
    cart.value.items.forEach((item: CartItem) => {
      const variation = cartGetters.getVariation(item);
      if (!variation) return;
      
      const productId = productGetters.getId(variation)?.toString() || '';
      if (productId) {
        const variationName = productGetters.getName(variation) || '';
        const variationProperties = variation.variationProperties || [];
        const variants = variationProperties
          .flatMap((group) => group.properties || [])
          .map((prop: any) => {
            const name = prop.names?.name || '';
            const value = prop.values?.value || '';
            return name && value ? `${name}:${value}` : '';
          })
          .filter(Boolean)
          .join(';');
        
        products[productId] = {
          amount: item.quantity,
          name: variationName,
          variants: variants || '',
        };
      }
    });

    // Get postal codes from addresses
    const shippingAddressId = cartGetters.getCustomerShippingAddressId(cart.value);
    const billingAddressId = cartGetters.getCustomerInvoiceAddressId(cart.value);
    const postalCodeParts: string[] = [];
    
    // Get addresses from address store
    const { addresses: shippingAddresses, get: getShipping } = useAddressStore(AddressType.Shipping);
    const { addresses: billingAddresses, get: getBilling } = useAddressStore(AddressType.Billing);
    
    if (shippingAddressId) {
      const shippingAddress = getShipping(shippingAddressId) || 
        shippingAddresses.value.find((addr: any) => addr.id === shippingAddressId);
      if (shippingAddress) {
        const postalCode = userAddressGetters.getPostalCode(shippingAddress);
        if (postalCode) {
          postalCodeParts.push(postalCode);
        }
      }
    }
    
    if (billingAddressId && billingAddressId !== shippingAddressId) {
      const billingAddress = getBilling(billingAddressId) || 
        billingAddresses.value.find((addr: any) => addr.id === billingAddressId);
      if (billingAddress) {
        const postalCode = userAddressGetters.getPostalCode(billingAddress);
        if (postalCode && !postalCodeParts.includes(postalCode)) {
          postalCodeParts.push(postalCode);
        }
      }
    }

    // Get shipping method name
    let shippingName = '';
    const { data: shippingMethodData, selectedMethod } = useCartShippingMethods();
    if (selectedMethod.value) {
      shippingName = shippingProviderGetters.getShippingMethodName(selectedMethod.value) || '';
    } else if (shippingMethodData.value?.list) {
      // Try to find the selected shipping method by profile ID
      const shippingProfileId = shippingProviderGetters.getShippingProfileId(cart.value);
      const selectedShippingMethod = shippingMethodData.value.list.find(
        (method: any) => shippingProviderGetters.getParcelServicePresetId(method) === shippingProfileId
      );
      if (selectedShippingMethod) {
        shippingName = shippingProviderGetters.getShippingMethodName(selectedShippingMethod) || '';
      }
    }

    // Get payment method name
    let paymentName = '';
    const { data: paymentMethodData } = usePaymentMethods();
    if (cart.value.methodOfPaymentId && paymentMethodData.value?.list) {
      const paymentMethod = paymentProviderGetters.getPaymentMethodById(
        paymentMethodData.value.list,
        cart.value.methodOfPaymentId
      );
      if (paymentMethod) {
        paymentName = paymentProviderGetters.getPaymentMethodName(paymentMethod) || '';
      }
    }

    return {
      scv: formatPrice(netTotal),
      currency,
      'tax-amount': formatPrice(taxAmount),
      'shipping-costs': formatPrice(shippingCosts),
      'payment-costs': formatPrice(paymentCosts),
      'postal-code': postalCodeParts.join(';') || '',
      products: JSON.stringify(products),
      shipping: shippingName,
      payment: paymentName,
      'usedvoucher': cartGetters.getCouponCode(cart.value) || '',
      'voucher-amount': formatPrice(cartGetters.getCouponDiscount(cart.value) || 0),
      'voucher-type': cartGetters.getCouponDiscount(cart.value) ? 'monetary' : '',
    };
  };

  const getProductData = (product: Product | null) => {
    if (!product) return null;

    const productId = productGetters.getId(product)?.toString() || '';
    const productName = productGetters.getName(product) || '';
    const productPrice = productGetters.getPrice(product) || 0;
    const originalPrice = productGetters.getCrossedPrice(product) || productPrice;
    const productImage = productGetters.getCoverImage(product) || '';
    const categoryIds = productGetters.getCategoryIds(product) || [];

    // Get product tags
    const productTags = tagGetters.getTags(product) || [];
    const tags = productTags.map((tag) => tagGetters.getTagName(tag)).filter(Boolean);

    // Get category name and paths from categoryTree
    const { data: categoryTree } = useCategoryTree();
    let productCategory = '';
    const categoryPaths: string[] = [];

    if (categoryTree.value && categoryIds.length > 0) {
      // Get the first category name
      const firstCategoryId = categoryIds[0];
      const categoryTreeItem = categoryTreeGetters.findCategoryById(categoryTree.value, firstCategoryId);
      if (categoryTreeItem) {
        productCategory = categoryTreeGetters.getName(categoryTreeItem) || '';
      }

      // Generate breadcrumbs for all categories to get paths
      categoryIds.forEach((categoryId) => {
        const breadcrumb = categoryTreeGetters.generateBreadcrumbFromCategory(
          categoryTree.value,
          categoryId,
        );
        // Extract category names from breadcrumb (excluding home)
        const categoryNames = breadcrumb
          .filter((item) => item.link !== '/')
          .map((item) => item.name)
          .filter(Boolean);
        if (categoryNames.length > 0) {
          categoryPaths.push(categoryNames.join(';'));
        }
      });
    }

    // Fallback to category ID if name not found
    if (!productCategory && categoryIds.length > 0) {
      productCategory = categoryIds[0]?.toString() || '';
    }

    const variants: string[] = [];

    // Extract variants from variationProperties
    if (product.variationProperties) {
      product.variationProperties.forEach((group) => {
        group.properties?.forEach((prop: any) => {
          const name = prop.names?.name || '';
          const value = prop.values?.value || '';
          if (name && value) {
            variants.push(`${name}:${value}`);
          }
        });
      });
    }

    return {
      'product-id': productId,
      'product-name': productName,
      'product-price': formatPrice(productPrice),
      'product-original-price': formatPrice(originalPrice),
      'product-image': productImage,
      'product-tags': tags.join(';'),
      'product-variants': variants.join(';'),
      'product-category': productCategory,
      'product-category-paths': categoryPaths.join(';'),
    };
  };

  const getCategoryData = () => {
    const path = route.path;
    // Check if we're on a category page (not product, cart, checkout, etc.)
    if (!path.includes('/category/') && !path.includes('/tag/') && path !== '/' && !path.match(/^\/[^\/]+$/)) {
      return null;
    }

    // Get products catalog (category data)
    const { data: productsCatalog } = useProducts();
    if (!productsCatalog.value?.category) {
      return null;
    }

    const category = productsCatalog.value.category;
    const categoryName = categoryGetters.getCategoryName(category) || '';
    
    // Get category path from breadcrumb
    const { data: categoryTree } = useCategoryTree();
    let categoryPath = '';
    if (categoryTree.value) {
      const breadcrumb = categoryTreeGetters.generateBreadcrumbFromCategory(
        categoryTree.value,
        categoryGetters.getId(category),
      );
      // Extract category names from breadcrumb (excluding home)
      const categoryNames = breadcrumb
        .filter((item) => item.link !== '/')
        .map((item) => item.name)
        .filter(Boolean);
      categoryPath = categoryNames.join(';');
    }

    // Get products on the category page
    const products = productsCatalog.value.products || [];
    const categoryProducts: Record<string, any> = {};
    products.forEach((product: Product) => {
      const productId = productGetters.getId(product)?.toString() || '';
      if (productId) {
        const productName = productGetters.getName(product) || '';
        const productPrice = productGetters.getPrice(product) || 0;
        const originalPrice = productGetters.getCrossedPrice(product) || productPrice;
        const productImage = productGetters.getCoverImage(product) || '';

        categoryProducts[productId] = {
          name: productName,
          price: formatPrice(productPrice),
          'original-price': formatPrice(originalPrice),
          image: productImage,
        };
      }
    });

    // Get sorting from URL
    const { getFacetsFromURL } = useCategoryFilter();
    const facets = getFacetsFromURL();
    const categorySorting = facets.sort || 'default';

    return {
      'category-name': categoryName,
      'category-path': categoryPath,
      'category-products': JSON.stringify(categoryProducts),
      'category-sorting': categorySorting,
    };
  };

  const getSearchData = () => {
    const searchTerm = route.query.q as string || '';
    if (!searchTerm) return null;

    // TODO: Get search products from route/state
    return {
      'search-term': searchTerm,
      'search-products': '{}',
      'search-sorting': 'default',
    };
  };

  const getSuccessData = () => {
    const orderId = route.params.orderId as string;
    if (!orderId) return null;

    return {
      success: '1',
      ordernumber: orderId,
    };
  };

  const shouldTransmitPersonalData = (): boolean => {
    if (!isAuthorized || !user.value) return false;

    const transmitNewsletter = getNewsletterData() === 'true';
    const transmitCustomer = getCustomerData() === 'true';

    // TODO: Check if user is newsletter subscriber
    const isNewsletterSubscriber = false;

    // TODO: Check if user has at least one successful order
    const hasOrders = false;

    return (transmitNewsletter && isNewsletterSubscriber) || (transmitCustomer && hasOrders);
  };

  const calculateRevenue = async (): Promise<string> => {
    if (!isAuthorized.value || !user.value) return '0.00';

    // Return cached value if available
    if (revenueCache.value !== null) {
      return revenueCache.value;
    }

    try {
      const { fetchCustomerOrders } = useCustomerOrders();
      let totalRevenue = 0;
      let page = 1;
      let hasMorePages = true;

      // Fetch all orders across all pages
      while (hasMorePages) {
        const ordersData = await fetchCustomerOrders({ page });
        
        if (!ordersData?.data?.entries || ordersData.data.entries.length === 0) {
          hasMorePages = false;
          break;
        }

        // Calculate revenue from current page of orders
        ordersData.data.entries.forEach((order: Order) => {
          // Only include successful orders (exclude returns/cancelled)
          const totals = orderGetters.getTotals(order);
          if (totals) {
            // Get net total (itemSumNet excludes taxes, shipping, payment costs)
            const netTotal = totals.itemSumNet || 0;
            
            // Only add if order is not a return/cancellation (positive values)
            if (netTotal > 0) {
              totalRevenue += netTotal;
            }
          }
        });

        // Check if there are more pages
        const totalPages = ordersData.data?.totals?.pages || 1;
        if (page >= totalPages) {
          hasMorePages = false;
        } else {
          page++;
        }
      }

      const revenue = formatPrice(totalRevenue);
      revenueCache.value = revenue;
      return revenue;
    } catch (error) {
      console.error('Error calculating revenue:', error);
      return '0.00';
    }
  };

  const getPersonalData = async () => {
    if (!shouldTransmitPersonalData() || !user.value) return null;

    const transmitRevenue = getRevenue() === 'true';
    // Calculate revenue asynchronously if needed
    const revenue = transmitRevenue ? await calculateRevenue() : '0.00';

    return {
      email: user.value.email || '',
      firstname: user.value.firstName || '',
      lastname: user.value.lastName || '',
      gender: (user.value as any).gender === 'female' ? 'f' : (user.value as any).gender === 'male' ? 'm' : '',
      title: (user.value as any).title || '',
      uid: user.value.id?.toString() || '',
      revenue: transmitRevenue ? revenue : '',
      customergroup: (user.value as any).plentyId?.toString() || '',
    };
  };

  const getAllData = async (product?: Product | null) => {
    const uptainId = getSetting() || runtimeConfig.public.uptainId || '';
    if (!uptainId || uptainId === 'XXXXXXXXXXXXXXXX') return null;

    const data: Record<string, string> = {
      plugin: getPluginVersion(),
      returnurl: getReturnUrl(),
      page: getPageType(),
      wishlist: getWishlistData(),
      comparison: getComparisonData(),
    };

    // Add cart data if cart has items
    const cartData = getCartData();
    if (cartData) {
      Object.assign(data, cartData);
    }

    // Add product data if on product page
    if (product) {
      const productData = getProductData(product);
      if (productData) {
        Object.assign(data, productData);
      }
    }

    // Add category data if on category page
    const categoryData = getCategoryData();
    if (categoryData) {
      Object.assign(data, categoryData);
    }

    // Add search data if on search page
    const searchData = getSearchData();
    if (searchData) {
      Object.assign(data, searchData);
    }

    // Add success data if on success page
    const successData = getSuccessData();
    if (successData) {
      Object.assign(data, successData);
    }

    // Add personal data if settings allow (now async for revenue calculation)
    const personalData = await getPersonalData();
    if (personalData) {
      Object.assign(data, personalData);
    }

    return data;
  };

  const shouldBlockCookies = (): boolean => {
    return getBlockCookies() === 'true';
  };

  return {
    getAllData,
    shouldBlockCookies,
    getUptainId: () => getSetting() || runtimeConfig.public.uptainId || '',
    calculateRevenue,
  };
};

