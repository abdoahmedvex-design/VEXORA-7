      const oldPrice = pkg.oldPrice === undefined || pkg.oldPrice === null ? undefined : int(pkg.oldPrice, 1, 10000000);
      if (oldPrice === null) return { ok: false, error: `Product ${name.en}: invalid price before discount.` };
      packages.push(oldPrice && oldPrice > price ? { label, price, oldPrice } : { label, price });
