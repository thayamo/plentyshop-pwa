import type { Cart, CartItem, Product, User, Order } from '@plentymarkets/shop-api';
import { cartGetters, productGetters, productPropertyGetters, orderGetters, categoryGetters, categoryTreeGetters, tagGetters, shippingProviderGetters, paymentProviderGetters, userAddressGetters, AddressType } from '@plentymarkets/shop-api';

export const useUptainData = () => {
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();
  const { data: cart } = useCart();
  const { user, isAuthorized } = useCustomer();
  const { wishlistItemIds, data: wishlistData, loading: wishlistLoading, fetchWishlist } = useWishlist();
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
    
    // Home page check must come first to avoid being misidentified as category
    if (path === '/' || path === '') return 'home';
    
    // Product page check must come before category check
    // Product pages have /product/ in path and route.meta.type === 'product'
    if (path.includes('/product/') || route.meta?.type === 'product') {
      return 'product';
    }
    
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/checkout')) return 'checkout';
    if (path.includes('/confirmation/')) return 'success';
    if (path.includes('/search')) return 'search';
    if (path.includes('/tag/')) return 'category';
    
    // Check if we're on a category page
    // Category pages are handled by [...slug].vue and have type: 'category' in route.meta
    // Also check if productsCatalog has category data as fallback
    // But exclude home and product pages which were already checked above
    if (route.meta?.type === 'category') {
      return 'category';
    }
    
    // Fallback: Check if productsCatalog has category data
    // This handles cases where route.meta.type might not be set yet
    // But exclude home and product pages which were already checked above
    const { data: productsCatalog } = useProducts();
    if (productsCatalog.value?.category && route.meta?.type !== 'product') {
      return 'category';
    }
    
    return 'other';
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (!price) return '0.00';
    return price.toFixed(2);
  };

  const getWishlistData = async (): Promise<string> => {
    // First, check if we have data in state
    let currentWishlistData = wishlistData.value;
    
    // If no data in state, try to fetch it
    if (!currentWishlistData || currentWishlistData.length === 0) {
      // Only fetch if user is authorized or has wishlist item IDs
      if (isAuthorized.value || wishlistItemIds.value?.length > 0) {
        if (!wishlistLoading.value) {
          try {
            console.log('[Uptain] Fetching wishlist, isAuthorized:', isAuthorized.value, 'wishlistItemIds:', wishlistItemIds.value);
            const fetchedData = await fetchWishlist();
            console.log('[Uptain] Fetched wishlist data:', fetchedData);
            currentWishlistData = fetchedData || wishlistData.value;
            console.log('[Uptain] Using wishlist data:', currentWishlistData);
          } catch (error) {
            console.warn('[Uptain] Failed to fetch wishlist:', error);
          }
        }
      }
    }

    // Process wishlist data
    if (currentWishlistData && Array.isArray(currentWishlistData) && currentWishlistData.length > 0) {
      const wishlistProducts: Record<string, any> = {};

      currentWishlistData.forEach((wishlistItem: any) => {
        console.log('[Uptain] Processing wishlistItem:', wishlistItem);
        
        // WishlistItem has structure: { item: {...}, texts: {...}, variation: {...}, images: {...} }
        // The item property contains the product data, variation contains variation-specific data
        const item = wishlistItem.item;
        const variation = wishlistItem.variation;
        const texts = wishlistItem.texts;
        
        if (!item && !variation) {
          console.warn('[Uptain] WishlistItem missing both item and variation:', wishlistItem);
          return;
        }

        // Use item if available (it's the full product), otherwise use variation
        const product = item || variation;
        
        // Get product ID - try from item first, then variation
        const productId = (item?.id?.toString()) || 
                         (variation?.itemId?.toString()) || 
                         productGetters.getId(product)?.toString() || 
                         '';
        console.log('[Uptain] Product ID:', productId, 'from item:', item?.id, 'from variation:', variation?.itemId);
        
        if (!productId) {
          console.warn('[Uptain] Could not get product ID. Item:', item, 'Variation:', variation);
          return;
        }

        // Get product name - try multiple sources
        // texts.name1 is the product name in WishlistItem
        // item.texts.name1 would be in the item if it has texts
        // productGetters.getName() should work on the product object
        let productName = texts?.name1 || 
                         item?.texts?.name1 || 
                         productGetters.getName(product) || 
                         productGetters.getName(item) || 
                         productGetters.getName(variation) || 
                         '';
        console.log('[Uptain] Product name:', productName, 
                   'from texts.name1:', texts?.name1, 
                   'from item.texts.name1:', item?.texts?.name1,
                   'from productGetters:', productGetters.getName(product));
        
        // Get variants from variationProperties as object, e.g. { size: '45' }
        const variationProperties = variation?.variationProperties || item?.variationProperties || [];
        const variantsObj: Record<string, string> = {};
        variationProperties
          .flatMap((group: any) => group.properties || [])
          .forEach((prop: any) => {
            const name = prop.names?.name || prop.name || '';
            const value = prop.values?.value || prop.value || '';
            if (name && value) variantsObj[name] = String(value);
          });
        const hasVariants = Object.keys(variantsObj).length > 0;
        console.log('[Uptain] Variants:', hasVariants ? variantsObj : '(none)', 'from properties:', variationProperties.length);

        wishlistProducts[productId] = {
          amount: 1,
          name: productName,
          ...(hasVariants && { variants: variantsObj }),
        };
        
        console.log('[Uptain] Added product to wishlist:', productId, wishlistProducts[productId]);
      });

      // Serialize with keys unquoted, string values in single quotes; omit variants when empty
      const escapeForSingleQuoted = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const serializeVariants = (v: Record<string, string>) => {
        const parts = Object.entries(v).map(([k, val]) => `${k}:'${escapeForSingleQuoted(val)}'`);
        return `{${parts.join(',')}}`;
      };
      const entries = Object.entries(wishlistProducts).map(([id, obj]) => {
        const parts = [`amount:${obj.amount}`, `name:'${escapeForSingleQuoted(obj.name)}'`];
        if (obj.variants && typeof obj.variants === 'object' && Object.keys(obj.variants).length > 0) {
          parts.push(`variants:${serializeVariants(obj.variants as Record<string, string>)}`);
        }
        return `${id}:{${parts.join(',')}}`;
      });
      const result = `{${entries.join(',')}}`;
      console.log('[Uptain] Wishlist result:', result, 'Products count:', Object.keys(wishlistProducts).length);
      return result;
    }

    console.log('[Uptain] No wishlist data available, returning empty');
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

    const products: Record<string, { amount: number; name: string; variants?: Record<string, string> }> = {};
    cart.value.items.forEach((item: CartItem) => {
      const variation = cartGetters.getVariation(item);
      if (!variation) return;

      const productId = productGetters.getId(variation)?.toString() || '';
      if (productId) {
        const variationName = productGetters.getName(variation) || '';
        const variationProperties = variation.variationProperties || [];
        const variantsObj: Record<string, string> = {};
        variationProperties.forEach((group: any) => {
          (group.properties || []).forEach((prop: any) => {
            const name = prop.names?.name || prop.name || '';
            const value = prop.values?.value || prop.value || '';
            if (name && value) variantsObj[name] = String(value);
          });
        });
        const hasVariants = Object.keys(variantsObj).length > 0;
        products[productId] = {
          amount: item.quantity,
          name: variationName,
          ...(hasVariants && { variants: variantsObj }),
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
        const postalCode = userAddressGetters.getPostCode(shippingAddress);
        if (postalCode) {
          postalCodeParts.push(postalCode);
        }
      }
    }
    
    if (billingAddressId && billingAddressId !== shippingAddressId) {
      const billingAddress = getBilling(billingAddressId) || 
        billingAddresses.value.find((addr: any) => addr.id === billingAddressId);
      if (billingAddress) {
        const postalCode = userAddressGetters.getPostCode(billingAddress);
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
        paymentName = paymentProviderGetters.getName(paymentMethod) || '';
      }
    }

    // Same format as wishlist: keys unquoted, single quotes for values, variants as object and omitted when empty
    const escapeForSingleQuoted = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const serializeVariants = (v: Record<string, string>) => {
      const parts = Object.entries(v).map(([k, val]) => `${k}:'${escapeForSingleQuoted(val)}'`);
      return `{${parts.join(',')}}`;
    };
    const cartProductEntries = Object.entries(products).map(([id, obj]) => {
      const parts = [`amount:${obj.amount}`, `name:'${escapeForSingleQuoted(obj.name)}'`];
      if (obj.variants && Object.keys(obj.variants).length > 0) {
        parts.push(`variants:${serializeVariants(obj.variants)}`);
      }
      return `${id}:{${parts.join(',')}}`;
    });
    const productsStr = Object.keys(products).length > 0 ? `{${cartProductEntries.join(',')}}` : '{}';

    return {
      scv: formatPrice(netTotal),
      currency,
      'tax-amount': formatPrice(taxAmount),
      'shipping-costs': formatPrice(shippingCosts),
      'payment-costs': formatPrice(paymentCosts),
      'postal-code': postalCodeParts.join(';') || '',
      products: productsStr,
      shipping: shippingName,
      payment: paymentName,
      'usedvoucher': cartGetters.getCouponCode(cart.value) || '',
      'voucher-amount': formatPrice(cartGetters.getCouponDiscount(cart.value) || 0),
      'voucher-type': cartGetters.getCouponDiscount(cart.value) ? 'monetary' : '',
    };
  };

  const getProductData = (product: Product | null) => {
    console.log('[Uptain] getProductData called with product:', product ? 'exists' : 'null');
    if (!product) {
      console.warn('[Uptain] getProductData: product is null or undefined');
      return null;
    }
    
    // Check if product has actual data (not just an empty object)
    if (Object.keys(product).length === 0) {
      console.warn('[Uptain] getProductData: product is an empty object');
      return null;
    }
    
    console.log('[Uptain] getProductData: product has data, processing...');

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
      const firstCategoryIdNumber = typeof firstCategoryId === 'string' ? parseInt(firstCategoryId, 10) : firstCategoryId;
      if (firstCategoryIdNumber !== undefined && !isNaN(firstCategoryIdNumber)) {
        const categoryTreeItem = categoryTreeGetters.findCategoryById(categoryTree.value, firstCategoryIdNumber);
        if (categoryTreeItem) {
          productCategory = categoryTreeGetters.getName(categoryTreeItem) || '';
        }
      }

      // Generate breadcrumbs for all categories to get paths
      categoryIds.forEach((categoryId) => {
        const categoryIdNumber = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
        if (categoryIdNumber === undefined || isNaN(categoryIdNumber)) return;
        const breadcrumb = categoryTreeGetters.generateBreadcrumbFromCategory(
          categoryTree.value,
          categoryIdNumber,
        );
        // Extract category names from breadcrumb (excluding home)
        const categoryNames = breadcrumb
          .filter((item: { link: string }) => item.link !== '/')
          .map((item: { name: string }) => item.name)
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

    const variantsObj: Record<string, string> = {};

    const addVariant = (name: string, value: string) => {
      if (name && value) variantsObj[name] = String(value);
      else if (value) variantsObj[String(value)] = String(value);
    };

    // Debug: Log the product structure to understand where variation properties might be
    console.log('[Uptain] Product structure for variants:', {
      hasVariationProperties: !!product.variationProperties,
      variationPropertiesLength: product.variationProperties?.length || 0,
      hasVariation: !!product.variation,
      variationKeys: product.variation ? Object.keys(product.variation) : [],
      hasProperties: !!product.properties,
      propertiesLength: product.properties?.length || 0,
      hasAttributes: !!(product as any).attributes,
      attributesLength: (product as any).attributes?.length || 0,
      hasGroupedAttributes: !!(product as any).groupedAttributes,
      groupedAttributesLength: (product as any).groupedAttributes?.length || 0,
      productKeys: Object.keys(product),
    });

    // Extract variants from variationProperties
    if (product.variationProperties && Array.isArray(product.variationProperties)) {
      console.log('[Uptain] Found product.variationProperties, processing...');
      product.variationProperties.forEach((group: any) => {
        if (group.properties && Array.isArray(group.properties)) {
          group.properties.forEach((prop: any) => {
            const value = prop.values?.value;
            if (!value) return;
            const name = prop.names?.name ?? '';
            addVariant(name, value);
          });
        }
      });
    }

    if (Object.keys(variantsObj).length === 0) {
      const variationPropertyGroups = productGetters.getPropertyGroups(product);
      console.log('[Uptain] Trying getPropertyGroups, result:', variationPropertyGroups);
      if (variationPropertyGroups && Array.isArray(variationPropertyGroups) && variationPropertyGroups.length > 0) {
        variationPropertyGroups.forEach((group: any) => {
          if (group.properties && Array.isArray(group.properties)) {
            group.properties.forEach((prop: any) => {
              const name = productPropertyGetters.getPropertyName(prop) || '';
              const value = productPropertyGetters.getPropertyValue(prop) || '';
              console.log('[Uptain] Property from getPropertyGroups:', { name, value });
              addVariant(name, value);
            });
          }
        });
      }
    }

    if (Object.keys(variantsObj).length === 0 && product.properties && Array.isArray(product.properties)) {
      console.log('[Uptain] Trying product.properties, length:', product.properties.length);
      product.properties.forEach((prop: any) => {
        const name = productPropertyGetters.getPropertyName(prop) || '';
        const value = productPropertyGetters.getPropertyValue(prop) || '';
        if (name && value) {
          console.log('[Uptain] Property from product.properties:', { name, value });
          addVariant(name, value);
        }
      });
    }

    if (Object.keys(variantsObj).length === 0 && (product as any).attributes && Array.isArray((product as any).attributes)) {
      console.log('[Uptain] Trying product.attributes, length:', (product as any).attributes.length);
      (product as any).attributes.forEach((attr: any, index: number) => {
        const name = attr.attribute?.backendName ||
                    attr.attribute?.name ||
                    attr.attribute?.names?.name ||
                    attr.name ||
                    '';
        const value = attr.value?.backendName ||
                     attr.value?.value ||
                     attr.values?.value ||
                     attr.value ||
                     '';
        console.log(`[Uptain] Attribute ${index} extracted:`, { name, value, attrStructure: { hasAttribute: !!attr.attribute, hasValue: !!attr.value } });
        if (name && value) {
          console.log('[Uptain] Attribute from product.attributes:', { name, value });
          addVariant(name, value);
        }
      });
    }

    if (Object.keys(variantsObj).length === 0 && (product as any).groupedAttributes && Array.isArray((product as any).groupedAttributes)) {
      console.log('[Uptain] Trying product.groupedAttributes, length:', (product as any).groupedAttributes.length);
      (product as any).groupedAttributes.forEach((group: any) => {
        if (group.attributes && Array.isArray(group.attributes)) {
          group.attributes.forEach((attr: any) => {
            const name = attr.name || attr.names?.name || '';
            const value = attr.value || attr.values?.value || '';
            if (name && value) {
              console.log('[Uptain] Attribute from product.groupedAttributes:', { name, value });
              addVariant(name, value);
            }
          });
        }
      });
    }

    const hasVariants = Object.keys(variantsObj).length > 0;
    console.log('[Uptain] Product variants result:', hasVariants ? variantsObj : '(none)',
               'from product.variationProperties:', product.variationProperties?.length || 0,
               'from getPropertyGroups:', productGetters.getPropertyGroups(product)?.length || 0);

    if (!hasVariants) {
      console.warn('[Uptain] No variants found! Full product structure:', JSON.stringify({
        variationProperties: product.variationProperties,
        properties: product.properties,
        variation: product.variation,
      }, null, 2));
    }

    // Same formatting as wishlist: keys unquoted, string values in single quotes; variants as object, omitted when empty
    const escapeForSingleQuoted = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const serializeVariants = (v: Record<string, string>) => {
      const parts = Object.entries(v).map(([k, val]) => `${k}:'${escapeForSingleQuoted(val)}'`);
      return `{${parts.join(',')}}`;
    };
    const productVariantsStr = hasVariants ? serializeVariants(variantsObj) : '';

    const productParts = [
      `productId:'${escapeForSingleQuoted(productId)}'`,
      `name:'${escapeForSingleQuoted(productName)}'`,
      `price:'${escapeForSingleQuoted(formatPrice(productPrice))}'`,
      `originalPrice:'${escapeForSingleQuoted(formatPrice(originalPrice))}'`,
      `image:'${escapeForSingleQuoted(productImage)}'`,
      `tags:'${escapeForSingleQuoted(tags.join(';'))}'`,
      `category:'${escapeForSingleQuoted(productCategory)}'`,
      `categoryPaths:'${escapeForSingleQuoted(categoryPaths.join(';'))}'`,
    ];
    if (hasVariants) {
      productParts.push(`variants:${serializeVariants(variantsObj)}`);
    }
    const productSerialized = `{${productParts.join(',')}}`;

    return {
      'product-id': productId,
      'product-name': productName,
      'product-price': formatPrice(productPrice),
      'product-original-price': formatPrice(originalPrice),
      'product-image': productImage,
      'product-tags': tags.join(';'),
      'product-variants': productVariantsStr,
      'product-category': productCategory,
      'product-category-paths': categoryPaths.join(';'),
      product: productSerialized,
    };
  };

  const getCategoryData = () => {
    const path = route.path;
    const pageType = getPageType();
    
    // Only return category data if we're actually on a category page
    // Exclude: product, cart, checkout, success, search, home, other pages
    if (pageType !== 'category') {
      return null;
    }
    
    // Additional check: make sure we're not on cart, checkout, product, search, or success pages
    if (path.includes('/cart') || path.includes('/checkout') || path.includes('/product/') || 
        path.includes('/search') || path.includes('/confirmation/')) {
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
      const categoryId = categoryGetters.getId(category);
      const categoryIdNumber = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
      if (categoryIdNumber !== undefined && !isNaN(categoryIdNumber)) {
        const breadcrumb = categoryTreeGetters.generateBreadcrumbFromCategory(
          categoryTree.value,
          categoryIdNumber,
        );
        // Extract category names from breadcrumb (excluding home)
        const categoryNames = breadcrumb
          .filter((item: { link: string }) => item.link !== '/')
          .map((item: { name: string }) => item.name)
          .filter(Boolean);
        categoryPath = categoryNames.join(';');
      }
    }

    // Get products on the category page
    const products = productsCatalog.value.products || [];
    const categoryProducts: Record<string, { name: string; price: string; originalPrice: string; image: string }> = {};
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
          originalPrice: formatPrice(originalPrice),
          image: productImage,
        };
      }
    });

    // Same format as wishlist: keys unquoted, string values in single quotes
    const escapeForSingleQuoted = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const categoryProductEntries = Object.entries(categoryProducts).map(([id, obj]) => {
      const inner = `name:'${escapeForSingleQuoted(obj.name)}',price:'${escapeForSingleQuoted(obj.price)}',originalPrice:'${escapeForSingleQuoted(obj.originalPrice)}',image:'${escapeForSingleQuoted(obj.image)}'`;
      return `${id}:{${inner}}`;
    });
    const categoryProductsStr = categoryProductEntries.length > 0 ? `{${categoryProductEntries.join(',')}}` : '{}';

    // Get sorting from URL
    const { getFacetsFromURL } = useCategoryFilter();
    const facets = getFacetsFromURL();
    const categorySorting = facets.sort || 'default';

    return {
      'category-name': categoryName,
      'category-path': categoryPath,
      'category-products': categoryProductsStr,
      'category-sorting': categorySorting,
    };
  };

  const getSearchData = () => {
    const pageType = getPageType();
    // Only return search data if we're actually on a search page
    if (pageType !== 'search') {
      return null;
    }
    
    const searchTerm = route.query.term as string || route.query.q as string || '';
    if (!searchTerm) return null;

    // Get search products from useSearch composable
    const { data: productsCatalog } = useSearch();
    const searchProducts: Record<string, any> = {};
    
    if (productsCatalog.value?.products) {
      productsCatalog.value.products.forEach((product: Product) => {
        const productId = productGetters.getId(product)?.toString() || '';
        if (productId) {
          const productName = productGetters.getName(product) || '';
          const productPrice = productGetters.getPrice(product) || 0;
          const originalPrice = productGetters.getCrossedPrice(product) || productPrice;
          const productImage = productGetters.getCoverImage(product) || '';

          searchProducts[productId] = {
            name: productName,
            price: formatPrice(productPrice),
            'original-price': formatPrice(originalPrice),
            image: productImage,
          };
        }
      });
    }

    // Get sorting from URL
    const { getFacetsFromURL } = useCategoryFilter();
    const facets = getFacetsFromURL();
    const searchSorting = facets.sort || 'default';

    return {
      'search-term': searchTerm,
      'search-products': JSON.stringify(searchProducts),
      'search-sorting': searchSorting,
    };
  };

  const getSuccessData = () => {
    const pageType = getPageType();
    // Only return success data if we're actually on a success page
    if (pageType !== 'success') {
      return null;
    }
    
    // Check if we're on a confirmation/success page
    // Route structure: /confirmation/[orderId]/[accessKey]
    // The orderId parameter is the correct order number
    const orderId = route.params.orderId as string;
    if (!orderId) return null;

    // The route parameter orderId is the correct order number
    // This matches the route structure: /confirmation/[orderId]/[accessKey]
    return {
      success: '1',
      ordernumber: orderId,
    };
  };

  const checkNewsletterSubscription = async (): Promise<boolean> => {
    if (!user.value) return false;
    
    // Check if user has emailFolder property (newsletter subscription indicator)
    // In PlentyMarkets, users with newsletter subscriptions typically have emailFolder set
    // This is a best-effort check as the exact property might vary
    const hasEmailFolder = !!(user.value as any).emailFolder;
    
    // Alternative: Check if there's a newsletter-related property
    // Note: The exact property name might need to be adjusted based on the actual API response
    return hasEmailFolder || !!(user.value as any).isNewsletterSubscriber || false;
  };

  const checkHasSuccessfulOrders = async (): Promise<boolean> => {
    if (!isAuthorized.value || !user.value) return false;

    try {
      const { fetchCustomerOrders } = useCustomerOrders();
      const ordersData = await fetchCustomerOrders({ page: 1 });
      
      if (!ordersData?.data?.entries || ordersData.data.entries.length === 0) {
        return false;
      }

      // Check if there's at least one successful order (positive itemSumNet)
      return ordersData.data.entries.some((order: Order) => {
        const totals = orderGetters.getTotals(order);
        if (totals) {
          const netTotal = totals.itemSumNet || 0;
          return netTotal > 0;
        }
        return false;
      });
    } catch (error) {
      console.error('Error checking orders:', error);
      return false;
    }
  };

  // Helper function to check if a setting value is enabled (supports both 'true'/'1' and 'false'/'0')
  const isSettingEnabled = (value: string | number | boolean | undefined | null): boolean => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0 || value == null) return false;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return false;
  };

  const shouldTransmitPersonalData = async (): Promise<boolean> => {
    if (!isAuthorized || !user.value) {
      console.log('[Uptain] shouldTransmitPersonalData: false - not authorized or no user', { isAuthorized: isAuthorized.value, hasUser: !!user.value });
      return false;
    }

    const transmitNewsletter = isSettingEnabled(getNewsletterData());
    const transmitCustomer = isSettingEnabled(getCustomerData());

    // Check if user is newsletter subscriber
    const isNewsletterSubscriber = await checkNewsletterSubscription();

    // Check if user has at least one successful order
    const hasOrders = await checkHasSuccessfulOrders();

    const shouldTransmit = (transmitNewsletter && isNewsletterSubscriber) || (transmitCustomer && hasOrders);
    console.log('[Uptain] shouldTransmitPersonalData:', 
      'shouldTransmit:', shouldTransmit,
      'transmitNewsletter:', transmitNewsletter,
      'transmitCustomer:', transmitCustomer,
      'isNewsletterSubscriber:', isNewsletterSubscriber,
      'hasOrders:', hasOrders,
      'newsletterSetting:', getNewsletterData(),
      'customerSetting:', getCustomerData()
    );
    return shouldTransmit;
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
        const lastPageNumber = ordersData.data?.lastPageNumber || 1;
        if (page >= lastPageNumber) {
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

  const getCustomerGroupName = (): string => {
    if (!user.value) return '';
    
    // Try to get customer group name from various possible properties
    // The exact property name might vary based on the API response
    const userAny = user.value as any;
    
    // Check for customer group name directly
    if (userAny.customerGroupName) return userAny.customerGroupName;
    if (userAny.customerGroup?.name) return userAny.customerGroup.name;
    if (userAny.className) return userAny.className;
    if (userAny.class?.name) return userAny.class.name;
    
    // Fallback to ID if name is not available
    if (userAny.customerGroupId) return userAny.customerGroupId.toString();
    if (userAny.classId) return userAny.classId.toString();
    if (userAny.plentyId) return userAny.plentyId.toString();
    
    return '';
  };

  const getPersonalData = async () => {
    const shouldTransmit = await shouldTransmitPersonalData();
    console.log('[Uptain] getPersonalData called:', 'shouldTransmit:', shouldTransmit, 'hasUser:', !!user.value);
    
    if (!shouldTransmit || !user.value) {
      console.log('[Uptain] getPersonalData: returning null', 'shouldTransmit:', shouldTransmit, 'hasUser:', !!user.value);
      return null;
    }

    const transmitRevenue = isSettingEnabled(getRevenue());
    // Calculate revenue asynchronously if needed
    const revenue = transmitRevenue ? await calculateRevenue() : '';

    const userAny = user.value as any;
    
    // Extract gender: 'f' for female, 'm' for male, '' for diverse or unknown
    let gender = '';
    if (userAny.gender === 'female' || userAny.gender === 'f' || userAny.gender === 'F') {
      gender = 'f';
    } else if (userAny.gender === 'male' || userAny.gender === 'm' || userAny.gender === 'M') {
      gender = 'm';
    }
    
    // Extract title (e.g. "Dr.", "Mrs.", "Mr.", etc.)
    const title = userAny.title || userAny.titleCode || '';

    const personalData = {
      email: user.value.email || '',
      firstname: user.value.firstName || '',
      lastname: user.value.lastName || '',
      gender: gender,
      title: title,
      uid: user.value.id?.toString() || '',
      revenue: revenue,
      customergroup: getCustomerGroupName(),
    };
    
    console.log('[Uptain] getPersonalData: returning data', personalData);
    return personalData;
  };

  const getAllData = async (product?: Product | null) => {
    const uptainId = getSetting() || runtimeConfig.public.uptainId || '';
    if (!uptainId || uptainId === 'XXXXXXXXXXXXXXXX') return null;

    const comparisonData = getComparisonData();
    const data: Record<string, string> = {
      plugin: getPluginVersion(),
      returnurl: getReturnUrl(),
      page: getPageType(),
      wishlist: await getWishlistData(),
      ...(comparisonData && comparisonData !== '{}' && { comparison: comparisonData }),
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
    return isSettingEnabled(getBlockCookies());
  };

  return {
    getAllData,
    shouldBlockCookies,
    getUptainId: () => getSetting() || runtimeConfig.public.uptainId || '',
    calculateRevenue,
  };
};
