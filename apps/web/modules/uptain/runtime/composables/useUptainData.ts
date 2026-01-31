import type { Cart, CartItem, Product, User } from '@plentymarkets/shop-api';
import { cartGetters, productGetters } from '@plentymarkets/shop-api';

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

    const netTotal = cartGetters.getNetTotal(cart.value);
    const currency = cart.value.currency || 'EUR';
    const taxAmount = cartGetters.getTaxTotal(cart.value);
    const shippingCosts = cartGetters.getShippingTotal(cart.value) || 0;
    const paymentCosts = 0; // TODO: Get payment costs if available

    const products: Record<string, any> = {};
    cart.value.items.forEach((item: CartItem) => {
      const productId = item.variation?.id?.toString() || '';
      if (productId) {
        products[productId] = {
          amount: item.quantity,
          name: item.variation?.name || '',
          variants: item.variation?.properties?.map((prop) => `${prop.name}:${prop.value}`).join(';') || '',
        };
      }
    });

    const deliveryAddress = cart.value.shippingAddress;
    const billingAddress = cart.value.billingAddress;
    const postalCode = [
      deliveryAddress?.postalCode ? `delivery:${deliveryAddress.postalCode}` : '',
      billingAddress?.postalCode ? `accounting:${billingAddress.postalCode}` : '',
    ]
      .filter(Boolean)
      .join(';');

    return {
      scv: formatPrice(netTotal),
      currency,
      'tax-amount': formatPrice(taxAmount),
      'shipping-costs': formatPrice(shippingCosts),
      'payment-costs': formatPrice(paymentCosts),
      'postal-code': postalCode || '',
      products: JSON.stringify(products),
      shipping: cart.value.shippingProfile?.name || '',
      payment: cart.value.methodOfPayment?.name || '',
      'usedvoucher': cart.value.couponCode || '',
      'voucher-amount': formatPrice(cart.value.couponDiscount || 0),
      'voucher-type': cart.value.couponDiscount ? 'monetary' : '',
    };
  };

  const getProductData = (product: Product | null) => {
    if (!product) return null;

    const productId = productGetters.getId(product)?.toString() || '';
    const productName = productGetters.getName(product) || '';
    const productPrice = productGetters.getPrice(product)?.net || 0;
    const originalPrice = productGetters.getOriginalPrice(product)?.net || productPrice;
    const productImage = productGetters.getCoverImage(product) || '';
    const productCategory = productGetters.getCategoryNames(product)?.[0] || '';
    const categoryPaths = productGetters.getCategoryNames(product)?.join('/') || '';

    const tags: string[] = [];
    const variants: string[] = [];

    // Extract variants
    product.variations?.forEach((variation) => {
      variation.properties?.forEach((prop) => {
        variants.push(`${prop.name}:${prop.value}`);
      });
    });

    return {
      'product-id': productId,
      'product-name': productName,
      'product-price': formatPrice(productPrice),
      'product-original-price': formatPrice(originalPrice),
      'product-image': productImage,
      'product-tags': tags.join(';'),
      'product-variants': variants.join(';'),
      'product-category': productCategory,
      'product-category-paths': categoryPaths,
    };
  };

  const getCategoryData = () => {
    // TODO: Implement category data collection
    return null;
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

  const getPersonalData = () => {
    if (!shouldTransmitPersonalData() || !user.value) return null;

    const transmitRevenue = getRevenue() === 'true';
    // TODO: Calculate total revenue from orders
    const revenue = '0.00';

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

  const getAllData = (product?: Product | null) => {
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

    // Add personal data if settings allow
    const personalData = getPersonalData();
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
  };
};

