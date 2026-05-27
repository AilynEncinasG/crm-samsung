import xmlrpc.client
from decouple import config


class OdooClient:
    def __init__(self):
        self.url = config('ODOO_URL')
        self.db = config('ODOO_DB')
        self.user = config('ODOO_USER')
        self.password = config('ODOO_PASSWORD')

        self.common = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/common')
        self.models = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/object')
        self.uid = None

    def authenticate(self):
        self.uid = self.common.authenticate(
            self.db,
            self.user,
            self.password,
            {}
        )

        if not self.uid:
            raise Exception('No se pudo autenticar con Odoo. Verifica base, usuario y contraseña.')

        return self.uid

    def execute_kw(self, model, method, args=None, kwargs=None):
        if self.uid is None:
            self.authenticate()

        return self.models.execute_kw(
            self.db,
            self.uid,
            self.password,
            model,
            method,
            args or [],
            kwargs or {}
        )

    def estado(self):
        uid = self.authenticate()

        version = self.common.version()

        usuarios = self.execute_kw(
            'res.users',
            'search_count',
            [[['active', '=', True]]]
        )

        contactos = self.execute_kw(
            'res.partner',
            'search_count',
            [[['active', '=', True]]]
        )

        productos = self.execute_kw(
            'product.product',
            'search_count',
            [[['active', '=', True]]]
        )

        return {
            'conectado': True,
            'uid': uid,
            'version': version,
            'usuarios_activos': usuarios,
            'contactos_activos': contactos,
            'productos_activos': productos,
        }
    
    def buscar_partner_por_email(self, email):
        if not email:
            return None

        ids = self.execute_kw(
            'res.partner',
            'search',
            [[['email', '=', email]]],
            {'limit': 1}
        )

        return ids[0] if ids else None

    def buscar_partner_por_nombre(self, nombre):
        if not nombre:
            return None

        ids = self.execute_kw(
            'res.partner',
            'search',
            [[['name', '=', nombre]]],
            {'limit': 1}
        )

        return ids[0] if ids else None

    def existe_partner(self, partner_id):
        if not partner_id:
            return False

        total = self.execute_kw(
            'res.partner',
            'search_count',
            [[['id', '=', partner_id]]]
        )

        return total > 0

    def crear_o_actualizar_cliente(self, cliente):
        nombre_completo = f'{cliente.nombre} {cliente.apellidos or ""}'.strip()

        vals = {
            'name': nombre_completo,
            'email': cliente.email or False,
            'active': bool(cliente.activo),
            'company_type': 'person',
            'customer_rank': 1,
        }

        partner_id = cliente.odoo_partner_id

        if partner_id and self.existe_partner(partner_id):
            self.execute_kw(
                'res.partner',
                'write',
                [[partner_id], vals]
            )

            return {
                'partner_id': partner_id,
                'accion': 'actualizado'
            }

        partner_id = self.buscar_partner_por_email(cliente.email)

        if not partner_id:
            partner_id = self.buscar_partner_por_nombre(nombre_completo)

        if partner_id:
            self.execute_kw(
                'res.partner',
                'write',
                [[partner_id], vals]
            )

            return {
                'partner_id': partner_id,
                'accion': 'vinculado_actualizado'
            }

        partner_id = self.execute_kw(
            'res.partner',
            'create',
            [vals]
        )

        return {
            'partner_id': partner_id,
            'accion': 'creado'
        }
    
    def existe_product_template(self, template_id):
        if not template_id:
            return False

        total = self.execute_kw(
            'product.template',
            'search_count',
            [[['id', '=', template_id]]]
        )

        return total > 0

    def buscar_product_template_por_codigo(self, codigo):
        if not codigo:
            return None

        ids = self.execute_kw(
            'product.template',
            'search',
            [[['default_code', '=', codigo]]],
            {'limit': 1}
        )

        return ids[0] if ids else None

    def obtener_producto_variante(self, template_id):
        registros = self.execute_kw(
            'product.template',
            'read',
            [[template_id]],
            {'fields': ['product_variant_id']}
        )

        if not registros:
            return None

        variante = registros[0].get('product_variant_id')

        if isinstance(variante, list) and variante:
            return variante[0]

        return None

    def crear_o_actualizar_producto(self, producto):
        codigo = f'CRM-PROD-{producto.id}'

        vals = {
            'name': producto.nombre,
            'default_code': codigo,
            'list_price': float(producto.precio_venta_sugerido or 0),
            'sale_ok': True,
            'purchase_ok': True,
            'active': bool(producto.activo),
        }

        template_id = producto.odoo_template_id

        if template_id and self.existe_product_template(template_id):
            self.execute_kw(
                'product.template',
                'write',
                [[template_id], vals]
            )

            product_id = self.obtener_producto_variante(template_id)

            return {
                'template_id': template_id,
                'product_id': product_id,
                'accion': 'actualizado'
            }

        template_id = self.buscar_product_template_por_codigo(codigo)

        if template_id:
            self.execute_kw(
                'product.template',
                'write',
                [[template_id], vals]
            )

            product_id = self.obtener_producto_variante(template_id)

            return {
                'template_id': template_id,
                'product_id': product_id,
                'accion': 'vinculado_actualizado'
            }

        template_id = self.execute_kw(
            'product.template',
            'create',
            [vals]
        )

        product_id = self.obtener_producto_variante(template_id)

        return {
            'template_id': template_id,
            'product_id': product_id,
            'accion': 'creado'
        }