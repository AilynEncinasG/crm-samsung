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