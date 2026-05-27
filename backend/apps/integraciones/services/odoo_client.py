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